import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_LEGACY_NAME, AUTH_COOKIE_NAME, canAccessPath, hasValidFacilityAccess, parseSerializedSession } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nextValue = `${pathname}${request.nextUrl.search}`;
  const encryptedCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const legacyCookie = request.cookies.get(AUTH_COOKIE_LEGACY_NAME)?.value;
  const session = parseSerializedSession(legacyCookie);

  if (!session && !encryptedCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", nextValue);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    // Encrypted token exists but middleware cannot decrypt in Edge runtime.
    // Server-side route/layout guards perform strict role/access checks.
    return NextResponse.next();
  }

  if (!canAccessPath(session.role, pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", nextValue);
    loginUrl.searchParams.set("reason", "role");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/inmate") && !hasValidFacilityAccess(session)) {
    const verifyUrl = new URL("/verify-identity", request.url);
    verifyUrl.searchParams.set("next", nextValue);
    verifyUrl.searchParams.set("reason", "entry");
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/inmate/:path*", "/management/:path*", "/lecturer/:path*", "/clockin/:path*"],
};
