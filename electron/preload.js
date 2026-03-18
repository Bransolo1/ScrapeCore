const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getApiKey: () => ipcRenderer.invoke("get-api-key"),
  saveApiKey: (key) => ipcRenderer.invoke("save-api-key", key),
  applyApiKey: (key) => ipcRenderer.invoke("apply-api-key", key),
  launchApp: (key) => ipcRenderer.invoke("launch-app", key),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
