"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [isFirstUser, setIsFirstUser] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [checkingFirstUser, setCheckingFirstUser] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showRegister = isFirstUser || isRegisterMode;

  useEffect(() => {
    fetch("/api/auth/check-first-user")
      .then((r) => r.json())
      .then((d: { isFirstUser?: boolean }) => {
        const first = d.isFirstUser ?? false;
        setIsFirstUser(first);
        if (first) setIsRegisterMode(true);
      })
      .catch(() => setIsFirstUser(false))
      .finally(() => setCheckingFirstUser(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (showRegister) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Registration failed.");
          setLoading(false);
          return;
        }
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl,
        });
        if (result?.error) {
          setError("Account created but sign-in failed. Please try logging in.");
        } else {
          router.push(callbackUrl);
        }
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl,
        });
        if (result?.error) {
          setError("Invalid email or password.");
        } else {
          router.push(callbackUrl);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingFirstUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020617]">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020617] px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size={44} showTagline />
        </div>

        {/* Mode toggle — always visible */}
        <div className="flex mb-6 bg-gray-100 dark:bg-white/[0.04] rounded-xl p-1 border border-gray-200 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => { setIsRegisterMode(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              !showRegister
                ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setIsRegisterMode(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              showRegister
                ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0f172a]/80 rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/20 backdrop-blur-xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {showRegister
              ? isFirstUser ? "Set up ScrapeCore" : "Create an account"
              : "Welcome back"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {showRegister
              ? isFirstUser
                ? "Create the first account to get started."
                : "Enter your details below."
              : "Sign in to pick up where you left off."}
          </p>

          {error && (
            <div className="mb-5 px-3.5 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {showRegister && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full name <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400 transition-all duration-150"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={showRegister ? "Min. 8 characters" : "Your password"}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400 transition-all duration-150"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-white text-sm font-medium rounded-xl transition-all duration-150"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {showRegister ? "Creating account…" : "Signing in…"}
                </span>
              ) : (
                showRegister ? "Create account" : "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020617]">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
