/**
 * Owners: ADMIN_EMAILS, comma-separated. Always super admins, and can't be
 * removed or demoted from inside the dashboard (more super admins can be
 * added on the Admins page). An empty or missing value
 * means there are no super admins (fails closed). Kept free of Next.js
 * request APIs so proxy.ts can share it.
 */
export function getSuperAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && getSuperAdminEmails().includes(email.trim().toLowerCase());
}
