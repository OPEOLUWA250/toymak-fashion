"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { PasswordInput } from "@/components/admin/password-input";

// Only return to a page inside the admin area after signing in.
function safeNext(value: string | null): string {
  return value && /^\/admin(\/[\w-]*)*(\?[^\s]*)?$/.test(value) && !value.startsWith("/admin/login")
    ? value
    : "/admin";
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary";

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "link" ? "That link is invalid or has expired. Request a new one." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      // Full navigation so proxy.ts sees the new session cookie.
      window.location.assign(safeNext(searchParams.get("next")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setNotice("If that email belongs to an admin, a reset link is on its way. Open it in this browser.");
    } catch {
      setError("Could not send the reset link. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock size={20} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-neutral-900">
          {mode === "login" ? "Store dashboard" : "Reset your password"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "login" ? "Sign in with your admin account." : "We'll email you a link to set a new password."}
        </p>

        <form onSubmit={mode === "login" ? handleLogin : handleForgot} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="admin-email" className="text-sm font-medium text-neutral-800">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {mode === "login" && (
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium text-neutral-800">Password</label>
              <PasswordInput
                id="admin-password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                className={inputClass}
              />
            </div>
          )}

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "forgot" : "login");
            setError(null);
            setNotice(null);
          }}
          className="mt-5 text-sm font-medium text-neutral-500 underline underline-offset-4 hover:text-primary"
        >
          {mode === "login" ? "Forgot your password?" : "Back to sign in"}
        </button>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
