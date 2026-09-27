"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, KeyRound, Loader2, ShieldCheck, Trash2, UserPlus, WandSparkles } from "lucide-react";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin-password";

type Role = "super_admin" | "admin";

interface AdminAccount {
  id: string | null;
  email: string;
  role: Role;
  /** Set in ADMIN_EMAILS: always a super admin, can't be changed here. */
  isOwner: boolean;
  hasAccount: boolean;
  lastSignInAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
  mustChangePassword: boolean;
}

// Readable but strong: no look-alike characters (0/O, 1/l/I).
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";

function generatePassword(length = 16): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join("");
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary";

/** Shown once after creating an admin or resetting a password. */
interface Handover {
  email: string;
  password: string;
}

export function AdminsView() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("admin");
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [handover, setHandover] = useState<Handover | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/admins");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load admins.");
      setAdmins(data.admins);
      setCurrentEmail(data.currentEmail);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load admins.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showHandover = (value: Handover) => {
    setHandover(value);
    setCopied(false);
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setFormError(`The temporary password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setIsAdding(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add this admin.");
      showHandover({ email: email.trim().toLowerCase(), password });
      setEmail("");
      setPassword("");
      setNewRole("admin");
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not add this admin.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleResetPassword = async (admin: AdminAccount) => {
    if (!admin.id) return;
    if (!window.confirm(`Give ${admin.email} a new temporary password? Their current password stops working.`)) return;
    const temporary = generatePassword();
    setBusyId(admin.id);
    setRowError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: admin.id, password: temporary }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reset the password.");
      showHandover({ email: admin.email, password: temporary });
      await load();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not reset the password.");
    } finally {
      setBusyId(null);
    }
  };

  const handleChangeRole = async (admin: AdminAccount) => {
    if (!admin.id) return;
    const role: Role = admin.role === "super_admin" ? "admin" : "super_admin";
    const message =
      role === "super_admin"
        ? `Make ${admin.email} a super admin? They'll be able to add, promote and remove people here, including other super admins (but not owners).`
        : `Make ${admin.email} a regular admin? They'll lose access to this page.`;
    if (!window.confirm(message)) return;
    setBusyId(admin.id);
    setRowError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: admin.id, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change this admin's role.");
      await load();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not change this admin's role.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (admin: AdminAccount) => {
    if (!admin.id) return;
    if (!window.confirm(`Remove ${admin.email}? They'll lose dashboard access immediately.`)) return;
    setBusyId(admin.id);
    setRowError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: admin.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove this admin.");
      if (handover?.email === admin.email) setHandover(null);
      await load();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not remove this admin.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async () => {
    if (!handover) return;
    try {
      await navigator.clipboard.writeText(handover.password);
      setCopied(true);
    } catch {
      // Clipboard blocked — the password is still visible to copy by hand.
    }
  };

  return (
    <div className="space-y-6">
      {handover && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold">Temporary password for {handover.email}</p>
          <p className="mt-1 leading-6">
            Share it privately (not in the same message as the email address, ideally). They&apos;ll sign in at{" "}
            <span className="font-medium">/admin/login</span> and must choose their own password straight away.
            This is the only time it&apos;s shown.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900">
              {handover.password}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <Copy size={13} />
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setHandover(null)}
              className="px-2 py-2 text-xs font-semibold text-emerald-800 underline underline-offset-4"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Add an admin</h2>
            <p className="text-sm text-neutral-500">They&apos;ll set their own password the first time they sign in.</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="new-admin-email" className="text-sm font-medium text-neutral-800">Email</label>
            <input
              id="new-admin-email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="new-admin-password" className="text-sm font-medium text-neutral-800">
              Temporary password
            </label>
            <div className="flex gap-2">
              <input
                id="new-admin-password"
                type="text"
                required
                minLength={MIN_ADMIN_PASSWORD_LENGTH}
                maxLength={200}
                autoComplete="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_ADMIN_PASSWORD_LENGTH} characters`}
                className={`${inputClass} font-mono`}
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:border-primary hover:text-primary"
                title="Generate a strong password"
              >
                <WandSparkles size={14} />
                Generate
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="new-admin-role" className="text-sm font-medium text-neutral-800">Role</label>
            <select
              id="new-admin-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className={inputClass}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isAdding ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {isAdding ? "Adding…" : "Add admin"}
          </button>
        </form>
        {formError && <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Who has access</h2>
            <p className="text-sm text-neutral-500">Everyone who can sign in to this dashboard</p>
          </div>
        </div>

        {rowError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{rowError}</p>}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-neutral-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : loadError ? (
          <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {loadError}{" "}
            <button type="button" onClick={() => void load()} className="font-semibold underline">
              Retry
            </button>
          </p>
        ) : (
          <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200">
            {admins.map((admin) => {
              const isSelf = admin.email === currentEmail;
              const busy = busyId !== null && busyId === admin.id;
              return (
                <div
                  key={`${admin.role}-${admin.email}`}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-900">
                      <span className="break-all">{admin.email}</span>
                      {isSelf && <span className="text-xs font-normal text-neutral-400">(you)</span>}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          admin.role === "super_admin" ? "bg-primary/10 text-primary" : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {admin.role === "super_admin" ? "Super admin" : "Admin"}
                      </span>
                      {admin.isOwner && (
                        <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          Owner
                        </span>
                      )}
                      {!admin.hasAccount && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          No Supabase user yet
                        </span>
                      )}
                      {admin.mustChangePassword && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          Waiting for first sign-in
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Last sign-in: {formatDate(admin.lastSignInAt)}
                      {admin.createdBy && <> · Added by {admin.createdBy}</>}
                    </p>
                  </div>

                  {!admin.isOwner && !isSelf && admin.id && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleChangeRole(admin)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        {admin.role === "super_admin" ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                        {admin.role === "super_admin" ? "Make admin" : "Make super admin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResetPassword(admin)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        <KeyRound size={13} />
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemove(admin)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
