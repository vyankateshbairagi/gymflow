import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { decrypt, getSessionCookie } from "@/lib/session";
import type { UserRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Data Access Layer for authentication/authorization.
//
// `verifySession()` does an "optimistic" check (JWT signature only — no DB
// hit) and is the thing to call from anywhere you just need to know who's
// asking. `getCurrentUser()` does a "secure" check (reads the User row
// fresh from the DB) and is what you call before returning or mutating
// real data, per the Next.js auth guide's DAL pattern. Both are wrapped in
// React's `cache()` so multiple calls during one render only do the work
// once.
// ---------------------------------------------------------------------------

export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      organizationId: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  // Covers the case where a valid token refers to a user that was
  // deactivated or deleted after the token was issued.
  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
});

/** Redirects to /login unless the caller is authenticated. */
export async function requireAuth() {
  return getCurrentUser();
}

/**
 * Redirects to /login if unauthenticated, or to /dashboard if authenticated
 * but not one of the allowed roles. Use this at the top of a page/action
 * that should only ever run for specific roles (e.g. OWNER-only settings).
 */
export async function requireRole(...allowed: UserRole[]) {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

/** The shape returned by getCurrentUser() — the safe, UI-facing user shape. */
export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;


