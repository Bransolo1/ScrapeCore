"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { usePlainMode } from "./PlainModeToggle";
import SettingsModal from "./SettingsModal";
import Logo from "./Logo";

const NAV_GROUPS: { items: { href: string; label: string; title: string }[] }[] = [
  {
    items: [
      { href: "/", label: "Collect & Analyse", title: "Scrape web data and run COM-B behavioural analysis" },
    ],
  },
  {
    items: [
      { href: "/dashboard",  label: "Dashboard",         title: "See patterns across all your analyses" },
      { href: "/compare",    label: "Compare",            title: "Diff two analyses to spot competitive gaps" },
      { href: "/monitoring", label: "Track Competitors",  title: "Set up automated competitor scraping on a schedule" },
    ],
  },
  {
    items: [
      { href: "/eval",  label: "Quality Lab", title: "Score and validate your analysis quality" },
      { href: "/audit", label: "Audit Log",   title: "Full trail of who ran what and when" },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

interface HeaderProps {
  onOpenGuide?: () => void;
}

export default function Header({ onOpenGuide }: HeaderProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { isPlainMode, toggle: togglePlain } = usePlainMode();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close gear menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-30 backdrop-blur-md shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Logo size={32} showTagline className="hidden sm:flex" />
          <Logo size={32} iconOnly className="sm:hidden" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex items-center">
              {gi > 0 && <div className="w-px h-5 bg-gray-200 mx-1.5" />}
              {group.items.map(({ href, label, title }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={title}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-gray-800 dark:bg-white/[0.10] text-white shadow-sm"
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
          {/* Gear dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Settings"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-black/30 py-1.5 z-50 animate-fade-in">
                <button
                  onClick={() => { setShowMenu(false); setShowSettings(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  API Keys & Costs
                </button>

                {onOpenGuide && (
                  <button
                    onClick={() => { setShowMenu(false); onOpenGuide(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.065 2.386-1.839 3.772-1.839 1.8 0 3 1.299 3 2.839 0 1.857-2.17 2.673-2.829 4.318-.117.292-.171.636-.171.982m0 2.5h.01" />
                    </svg>
                    How it works
                  </button>
                )}

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={togglePlain}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Plain language
                  </span>
                  <span className={`w-8 h-4.5 rounded-full relative transition-colors ${isPlainMode ? "bg-brand-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${isPlainMode ? "left-4" : "left-0.5"}`} />
                  </span>
                </button>

                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {theme === "dark" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      )}
                    </svg>
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* User avatar + sign-out (desktop) */}
          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <div className="w-7 h-7 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center shrink-0" title={session.user.email ?? ""}>
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

          {/* Hamburger button (mobile) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 animate-fade-in">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {ALL_NAV_ITEMS.map(({ href, label, title }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={title}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-gray-800 dark:bg-white/[0.10] text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          {session?.user && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white leading-none">
                    {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-600 truncate max-w-48">{session.user.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
    </>
  );
}
