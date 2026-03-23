"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

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
        // Register new user
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
        // Auto-login after registration
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
        // Regular login
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-none">ScrapeCore</h1>
            <p className="text-xs text-gray-500 mt-0.5">Behavioural Market Intelligence</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            {isFirstUser ? "Create your account" : showRegister ? "Create an account" : "Sign in to ScrapeCore"}
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            {isFirstUser
              ? "No accounts exist yet. Set up your admin account to get started."
              : showRegister
              ? "Sign up to get started with ScrapeCore."
              : "Enter your credentials to continue."}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {showRegister && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Full name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@organisation.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={showRegister ? "At least 8 characters" : ""}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
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

        {/* Toggle between Sign in / Sign up */}
        {!isFirstUser && (
          <p className="text-center text-xs text-gray-500 mt-4">
            {showRegister ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setError(null); }}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setError(null); }}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
