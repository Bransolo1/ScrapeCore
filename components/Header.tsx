"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import PlainModeToggle from "./PlainModeToggle";
import SettingsModal from "./SettingsModal";

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const NAV = [
  { href: "/",           label: "Analyse",   title: "Run a new behavioural analysis" },
  { href: "/dashboard",  label: "Dashboard", title: "Quality trends and aggregate stats" },
  { href: "/compare",    label: "Compare",   title: "Side-by-side COM-B diff between two analyses" },
  { href: "/eval",       label: "Eval Lab",  title: "Rubric scoring and prompt A/B comparison" },
  { href: "/monitoring", label: "Monitor",   title: "Scheduled competitor monitoring" },
  { href: "/audit",      label: "Audit Log", title: "Full audit trail of analysis activity" },
];

export default function Header() {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold text-gray-900 leading-none">ScrapeCore</h1>
            <p className="text-[11px] text-gray-500 mt-0.5 tracking-wide uppercase">Market Intelligence</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5" role="navigation" aria-label="Main navigation">
          {NAV.map(({ href, label, title }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={title}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
            COM-B · BCW · BCT
          </span>

          {/* Plain language mode toggle */}
          <PlainModeToggle />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User avatar + sign-out */}
          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-surface-800 flex items-center justify-center shrink-0 ring-2 ring-brand-400/30" title={session.user.email ?? ""}>
                <span className="text-xs font-bold text-brand-300 leading-none">
                  {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1 animate-fade-in" role="navigation" aria-label="Mobile navigation">
          {NAV.map(({ href, label, title }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={title}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {session?.user && (
            <button
              onClick={() => { signOut({ callbackUrl: "/login" }); setMobileNavOpen(false); }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          )}
        </nav>
      )}
    </header>
    </>
  );
}
