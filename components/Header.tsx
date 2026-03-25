"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import PlainModeToggle from "./PlainModeToggle";
import SettingsModal from "./SettingsModal";
import Logo from "./Logo";

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

const NAV_GROUPS: { label: string; items: { href: string; label: string; title: string }[] }[] = [
  {
    label: "",
    items: [
      { href: "/", label: "Collect & Analyse", title: "Scrape web data and run COM-B behavioural analysis" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard",  label: "Dashboard",         title: "See patterns across all your analyses" },
      { href: "/compare",    label: "Compare",            title: "Diff two analyses to spot competitive gaps" },
      { href: "/monitoring", label: "Track Competitors",  title: "Set up automated competitor scraping on a schedule" },
    ],
  },
  {
    label: "Quality",
    items: [
      { href: "/eval",  label: "Quality Lab", title: "Score and validate your analysis quality" },
      { href: "/audit", label: "Audit Log",   title: "Full trail of who ran what and when" },
    ],
  },
];

export default function Header() {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-30 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Logo size={32} showTagline className="hidden sm:flex" />
          <Logo size={32} iconOnly className="sm:hidden" />
        </Link>

        {/* Nav — grouped by mission flow */}
        <nav className="flex items-center gap-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex items-center">
              {gi > 0 && <div className="w-px h-5 bg-gray-200 mx-1.5" />}
              {group.label && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 mr-1 hidden lg:inline">{group.label}</span>
              )}
              {group.items.map(({ href, label, title }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={title}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-50 text-brand-700 border border-brand-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
            COM-B · BCW · BCT
          </span>

          {/* Plain language mode toggle */}
          <PlainModeToggle />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            title="Settings — API keys and preferences"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User avatar + sign-out */}
          {session?.user && (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0" title={session.user.email ?? ""}>
                <span className="text-xs font-bold text-white leading-none">
                  {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
