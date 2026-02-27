import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, canAccessPath, parseSerializedSession } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nextValue = `${pathname}${request.nextUrl.search}`;
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSerializedSession(cookieValue);

  if (!session) {
    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("next", nextValue);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(session.role, pathname)) {
    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("next", nextValue);
    loginUrl.searchParams.set("reason", "role");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/inmate/:path*", "/management/:path*"],
};
