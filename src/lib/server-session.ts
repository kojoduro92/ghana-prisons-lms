import { cookies } from "next/headers";
import {
  AUTH_COOKIE_LEGACY_NAME,
  AUTH_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  parseSerializedSession,
  serializeSession,
} from "@/lib/auth";
import { decryptSessionToken, encryptSessionToken } from "@/lib/auth-crypto";
import type { Role, UserSession } from "@/types/domain";

export async function getServerSession(): Promise<UserSession | null> {
  const store = await cookies();
  const encrypted = store.get(AUTH_COOKIE_NAME)?.value;
  const fromEncrypted = decryptSessionToken(encrypted);
  if (fromEncrypted) {
    return fromEncrypted;
  }
  const legacy = store.get(AUTH_COOKIE_LEGACY_NAME)?.value;
  return parseSerializedSession(legacy);
}

export async function requireServerSessionRole(expectedRole: Role): Promise<UserSession | null> {
  const session = await getServerSession();
  if (!session || session.role !== expectedRole) {
    return null;
  }
  return session;
}

export async function setServerSessionCookies(session: UserSession): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, encryptSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
  // Transitional cookie for existing client-side app shell flows.
  store.set(AUTH_COOKIE_LEGACY_NAME, serializeSession(session), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function clearServerSessionCookies(): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  store.set(AUTH_COOKIE_LEGACY_NAME, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}
