const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

// ─── Constants ────────────────────────────────────────────────────────────────

const PORT = 3579; // avoid clash with next dev default 3000
const DEV = !app.isPackaged;
const USERDATA = app.getPath("userData");
const ENV_FILE = path.join(USERDATA, ".env");

// ─── Read / write persisted env vars ─────────────────────────────────────────

function readStoredEnv() {
  try {
    if (!fs.existsSync(ENV_FILE)) return {};
    return Object.fromEntries(
      fs
        .readFileSync(ENV_FILE, "utf8")
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

function writeStoredEnv(vars) {
  const lines = Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  fs.mkdirSync(USERDATA, { recursive: true });
  fs.writeFileSync(ENV_FILE, lines, "utf8");
}

// ─── Poll until server is ready ───────────────────────────────────────────────

function waitForServer(port, timeout = 60_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(new Error("Server did not start within 60 s"));
        } else {
          setTimeout(check, 400);
        }
      });
      req.end();
    };
    check();
  });
}

// ─── Launch Next.js server ────────────────────────────────────────────────────

let serverProcess = null;

function startServer(env = {}) {
  // In packaged app, run the standalone server.js bundle
  // In dev, run `next dev`
  let serverCmd, serverArgs, serverCwd;

  if (DEV) {
    serverCmd = process.platform === "win32" ? "npx.cmd" : "npx";
    serverArgs = ["next", "dev", "--port", String(PORT)];
    serverCwd = path.join(__dirname, "..");
  } else {
    // packaged: server.js is at resources/app/.next/standalone/server.js
    const serverJs = path.join(process.resourcesPath, "app", ".next", "standalone", "server.js");
    serverCmd = process.execPath; // bundled Node via Electron
    serverArgs = [serverJs];
    serverCwd = path.dirname(serverJs);
  }

  const childEnv = {
    ...process.env,
    ...env,
    PORT: String(PORT),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: DEV ? "development" : "production",
    // Pass env file path so the Next.js server can read updated API keys without restart
    SCRAPECORE_ENV_FILE: ENV_FILE,
    SKIP_AUTH: "true",
  };

  serverProcess = spawn(serverCmd, serverArgs, {
    cwd: serverCwd,
    env: childEnv,
    stdio: "pipe",
    windowsHide: true,
  });

  serverProcess.stdout?.on("data", (d) => process.stdout.write(d));
  serverProcess.stderr?.on("data", (d) => process.stderr.write(d));

  serverProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      dialog.showErrorBox("Server crashed", `Next.js server exited with code ${code}. Check that your API key is correct.`);
    }
  });
}

// ─── Setup window (first-run API key entry) ───────────────────────────────────

let setupWin = null;

function createSetupWindow() {
  setupWin = new BrowserWindow({
    width: 520,
    height: 420,
    resizable: false,
    title: "ScrapeCore — Setup",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setupWin.loadFile(path.join(__dirname, "setup.html"));
  setupWin.on("closed", () => { setupWin = null; });
}

// ─── Main app window ──────────────────────────────────────────────────────────

let mainWin = null;

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "ScrapeCore",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Loading splash while server starts
  mainWin.loadURL("data:text/html,<html style='background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui'><p style='color:#94a3b8;font-size:14px'>Starting ScrapeCore…</p></html>");
  mainWin.show();

  waitForServer(PORT)
    .then(() => {
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.loadURL(`http://127.0.0.1:${PORT}`);
      }
    })
    .catch((err) => {
      dialog.showErrorBox("Startup failed", err.message);
    });

  // Open external links in browser, not in the app window
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWin.on("closed", () => { mainWin = null; });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle("get-api-key", () => {
  return readStoredEnv().ANTHROPIC_API_KEY ?? "";
});

ipcMain.handle("save-api-key", (_event, key) => {
  const stored = readStoredEnv();
  stored.ANTHROPIC_API_KEY = key.trim();
  writeStoredEnv(stored);
  return true;
});

ipcMain.handle("launch-app", (_event, key) => {
  const stored = readStoredEnv();
  stored.ANTHROPIC_API_KEY = key.trim();
  writeStoredEnv(stored);

  if (setupWin && !setupWin.isDestroyed()) setupWin.close();

  const env = { ANTHROPIC_API_KEY: key.trim() };
  startServer(env);
  createMainWindow();
});

// Apply a new API key immediately — server reads from file on next request
ipcMain.handle("apply-api-key", (_event, key) => {
  const stored = readStoredEnv();
  stored.ANTHROPIC_API_KEY = key.trim();
  writeStoredEnv(stored);
  return true;
});

ipcMain.handle("open-external", (_event, url) => {
  shell.openExternal(url);
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const stored = readStoredEnv();
  // Always start immediately — no blocking setup screen.
  // If no API key is configured, the web UI will prompt for it inline.
  const env = stored.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: stored.ANTHROPIC_API_KEY } : {};
  startServer(env);
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
