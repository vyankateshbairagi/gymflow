import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

import type { UserRole } from "@prisma/client";

const COOKIE_NAME = "gymflow_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const secret = process.env.SESSION_SECRET;
if (!secret) {
  // Fail loudly at import time rather than silently signing tokens with
  // `undefined` — a missing secret should never make it into production.
  throw new Error(
    "SESSION_SECRET is not set. Add it to your .env file (see .env.example)."
  );
}
const encodedKey = new TextEncoder().encode(secret);

// Deliberately minimal: enough to make optimistic authorization decisions
// (in `proxy.ts` and for UI) without a DB round trip. No PII, no password
// data. Anything sensitive (email, etc.) is fetched fresh from the DB in
// `getCurrentUser()` for real data access.
export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: UserRole;
};

export async function encrypt(payload: SessionPayload & JWTPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload & JWTPayload;
  } catch {
    // Expired, tampered with, or signed with a different secret.
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
