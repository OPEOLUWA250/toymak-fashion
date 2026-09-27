import { NextRequest, NextResponse } from "next/server";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin-password";
import { adminRoute } from "@/lib/server/admin-auth";
import { getSuperAdminEmails, isSuperAdminEmail } from "@/lib/server/admin-emails";
import { getSupabaseAdmin } from "@/lib/server/supabase";

/**
 * Super-admin-only management of dashboard admins. Owners come from
 * ADMIN_EMAILS and are listed read-only. Everyone else lives in admin_users
 * as an admin or super admin, each backed by a Supabase Auth user created
 * here with a temporary password they must replace at first sign-in.
 *
 * Nobody can demote or remove themselves, so the super admin making a
 * change always remains — the dashboard can't be left without one.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_SET_UP =
  "The admins table is missing or out of date. Run supabase/migrations/0013_admin_users.sql in the Supabase SQL Editor (it's safe to re-run).";

type Role = "admin" | "super_admin";

interface AdminRow {
  id: string;
  email: string;
  role: Role;
  created_by: string;
  created_at: string;
}

function parseRole(value: unknown): Role | null {
  return value === "admin" || value === "super_admin" ? value : null;
}

// Missing table (PGRST205 / 42P01) or missing column (42703) — the
// migration hasn't been run, or an older version of it was.
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01" || error?.code === "42703";
}

function passwordProblem(password: unknown): string | null {
  return typeof password !== "string" || password.length < MIN_ADMIN_PASSWORD_LENGTH || password.length > 200
    ? `The temporary password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`
    : null;
}

export const GET = adminRoute(
  async (_request: NextRequest, _context, session) => {

    const db = getSupabaseAdmin();
    const { data: rows, error } = await db
      .from("admin_users")
      .select("id,email,role,created_by,created_at")
      .order("created_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: isMissingTable(error) ? NOT_SET_UP : "Could not load admins." }, { status: 500 });
    }

    const { data: userData, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return NextResponse.json({ error: "Could not load admin accounts." }, { status: 500 });
    const usersById = new Map(userData.users.map((user) => [user.id, user]));
    const usersByEmail = new Map(userData.users.map((user) => [user.email?.toLowerCase(), user]));

    const owners = getSuperAdminEmails().map((email) => {
      const user = usersByEmail.get(email);
      return {
        id: user?.id ?? null,
        email,
        role: "super_admin" as const,
        isOwner: true,
        hasAccount: !!user,
        lastSignInAt: user?.last_sign_in_at ?? null,
        createdAt: user?.created_at ?? null,
        createdBy: null,
        mustChangePassword: false,
      };
    });
    const admins = (rows as AdminRow[]).map((row) => {
      const user = usersById.get(row.id);
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        isOwner: false,
        hasAccount: !!user,
        lastSignInAt: user?.last_sign_in_at ?? null,
        createdAt: row.created_at,
        createdBy: row.created_by,
        mustChangePassword: user?.app_metadata?.must_change_password === true,
      };
    });

    return NextResponse.json(
      { admins: [...owners, ...admins], currentEmail: session.email },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  },
  { superAdmin: true },
);

/** Adds an admin or super admin with a temporary password. */
export const POST = adminRoute(
  async (request: NextRequest, _context, session) => {

    let body: { email?: unknown; password?: unknown; role?: unknown };
    try { body = await request.json(); } catch { body = {}; }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const role = body.role === undefined ? "admin" : parseRole(body.role);
    if (!role) return NextResponse.json({ error: "Choose Admin or Super admin." }, { status: 400 });
    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (isSuperAdminEmail(email)) {
      return NextResponse.json({ error: "That email is already an owner (set in ADMIN_EMAILS)." }, { status: 409 });
    }

    const db = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await db.from("admin_users").select("id").eq("email", email).maybeSingle();
    if (lookupError) {
      return NextResponse.json({ error: isMissingTable(lookupError) ? NOT_SET_UP : "Could not add this admin." }, { status: 500 });
    }
    if (existing) return NextResponse.json({ error: "That email is already an admin." }, { status: 409 });

    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password: body.password as string,
      email_confirm: true,
      app_metadata: { must_change_password: true },
    });
    if (createError || !created.user) {
      const exists = createError?.code === "email_exists" || /already/i.test(createError?.message ?? "");
      return NextResponse.json(
        {
          error: exists
            ? "A Supabase user with this email already exists. Delete it under Authentication → Users first, or use another email."
            : createError?.message || "Could not create this admin's account.",
        },
        { status: exists ? 409 : 500 },
      );
    }

    const { error: insertError } = await db
      .from("admin_users")
      .insert({ id: created.user.id, email, role, created_by: session.email });
    if (insertError) {
      // Don't leave a login behind that isn't an admin.
      await db.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: "Could not add this admin. Please retry." }, { status: 500 });
    }

    return NextResponse.json({ added: true, id: created.user.id });
  },
  { superAdmin: true },
);

/**
 * Either changes an admin's role (`{ id, role }`) or gives them a new
 * temporary password they must change at next sign-in (`{ id, password }`).
 */
export const PATCH = adminRoute(
  async (request: NextRequest, _context, session) => {

    let body: { id?: unknown; password?: unknown; role?: unknown };
    try { body = await request.json(); } catch { body = {}; }
    if (typeof body.id !== "string") return NextResponse.json({ error: "Choose an admin." }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: row } = await db.from("admin_users").select("id").eq("id", body.id).maybeSingle();
    if (!row) return NextResponse.json({ error: "Admin not found. Owners are managed in ADMIN_EMAILS." }, { status: 404 });

    if (body.role !== undefined) {
      const role = parseRole(body.role);
      if (!role) return NextResponse.json({ error: "Choose Admin or Super admin." }, { status: 400 });
      if (body.id === session.user.id) {
        return NextResponse.json({ error: "You can't change your own role. Ask another super admin." }, { status: 400 });
      }
      const { error } = await db.from("admin_users").update({ role }).eq("id", body.id);
      if (error) return NextResponse.json({ error: "Could not change this admin's role." }, { status: 500 });
      return NextResponse.json({ updated: true });
    }

    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const { error } = await db.auth.admin.updateUserById(body.id, {
      password: body.password as string,
      app_metadata: { must_change_password: true },
    });
    if (error) return NextResponse.json({ error: error.message || "Could not reset the password." }, { status: 500 });
    return NextResponse.json({ updated: true });
  },
  { superAdmin: true },
);

/** Removes an admin: deletes their login, which ends their access immediately. */
export const DELETE = adminRoute(
  async (request: NextRequest, _context, session) => {

    let body: { id?: unknown };
    try { body = await request.json(); } catch { body = {}; }
    if (typeof body.id !== "string") return NextResponse.json({ error: "Choose an admin." }, { status: 400 });
    if (body.id === session.user.id) {
      return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: row } = await db.from("admin_users").select("id").eq("id", body.id).maybeSingle();
    if (!row) return NextResponse.json({ error: "Admin not found. Owners are managed in ADMIN_EMAILS." }, { status: 404 });

    // Remove the admin record first: that alone ends their access, and doing
    // it here (not via the login's cascade) records who removed them.
    const { error: rowError } = await db.from("admin_users").delete().eq("id", body.id);
    if (rowError) return NextResponse.json({ error: "Could not remove this admin. Please retry." }, { status: 500 });
    const { error } = await db.auth.admin.deleteUser(body.id);
    if (error && !/not found/i.test(error.message)) {
      console.error(`Admin ${body.id} lost access, but their login could not be deleted:`, error.message);
    }
    return NextResponse.json({ removed: true });
  },
  { superAdmin: true },
);
