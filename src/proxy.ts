import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { decrypt, SESSION_COOKIE_NAME } from "@/lib/session";

// Every real (non-auth) route lives directly under the domain root because
// they come from the (dashboard) route group, which doesn't add a URL
// segment — so this is the full set of paths that require a session.
const protectedRoutes = [
  "/dashboard",
  "/members",
  "/plans",
  "/subscriptions",
  "/payments",
  "/attendance",
  "/reports",
  "/settings",
];
const authRoutes = ["/login"];

// This is an OPTIMISTIC check only: it verifies the JWT signature/expiry
// from the cookie, but never touches the database. It exists to bounce
// obviously-unauthenticated requests before any rendering happens. The
// SECURE check — confirming the user still exists and is active — happens
// in `getCurrentUser()` (src/lib/auth.ts), which every dashboard route hits
// via the (dashboard) layout.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
  const isAuthRoute = authRoutes.some((route) => path === route);

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files, image optimization, and favicon so auth logic
    // never blocks assets from loading.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
