"use client";

import { useEffect, useState } from "react";

export interface AdminSessionInfo {
  email: string;
  role: "super_admin" | "admin";
  mustChangePassword: boolean;
}

// One request shared by every component on the page (sidebar, profile menu).
let sessionPromise: Promise<AdminSessionInfo | null> | null = null;

function loadSession(): Promise<AdminSessionInfo | null> {
  sessionPromise ??= fetch("/api/auth/session")
    .then(async (response) => {
      // Session expired while the dashboard was open — back to sign-in.
      if (response.status === 401) {
        window.location.assign("/admin/login");
        return null;
      }
      if (!response.ok) throw new Error("session");
      return (await response.json()) as AdminSessionInfo;
    })
    .catch(() => {
      sessionPromise = null; // let a later render retry
      return null;
    });
  return sessionPromise;
}

/** The signed-in admin's email and role, or null while loading. */
export function useAdminSession(): AdminSessionInfo | null {
  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  useEffect(() => {
    let active = true;
    void loadSession().then((value) => {
      if (active) setSession(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return session;
}
