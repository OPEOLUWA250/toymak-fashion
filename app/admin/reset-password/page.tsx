"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin-password";
import { PasswordInput } from "@/components/admin/password-input";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary";

/**
 * Set a new admin password — reached from a reset email (via
 * /api/auth/callback, which signs the admin in) or from the profile menu.
 * Behind proxy.ts, so only a signed-in admin sees it.
 */
export default function AdminResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your password.");
      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound size={20} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-neutral-900">Set a new password</h1>
        <p className="mt-1 text-sm text-neutral-500">At least {MIN_ADMIN_PASSWORD_LENGTH} characters.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-neutral-800">New password</label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-neutral-800">Confirm password</label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              className={inputClass}
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Save password
          </button>
        </form>
      </div>
    </main>
  );
}
