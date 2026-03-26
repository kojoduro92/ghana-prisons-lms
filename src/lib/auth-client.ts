"use client";

import type { UserSession } from "@/types/domain";
import { AUTH_COOKIE_LEGACY_NAME, SESSION_DURATION_SECONDS, serializeSession } from "@/lib/auth";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";

export function persistSession(session: UserSession): void {
  if (typeof document === "undefined") return;

  const cookie = `${AUTH_COOKIE_LEGACY_NAME}=${serializeSession(session)}; path=/; max-age=${SESSION_DURATION_SECONDS}; samesite=lax`;
  document.cookie = cookie;
  browserStorage.saveState(STORAGE_KEYS.session, session);
}

export function clearSession(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE_LEGACY_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
  }

  browserStorage.clearState(STORAGE_KEYS.session);
}

export function getSessionFromBrowser(): UserSession | null {
  const session = browserStorage.loadState<UserSession>(STORAGE_KEYS.session);

  if (!session) {
    return null;
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    clearSession();
    return null;
  }

  return session;
}

export function signOutTo(redirectTo: string): void {
  void fetch("/api/v1/auth/logout", {
    method: "POST",
  }).catch(() => null);

  clearSession();
  browserStorage.clearState(STORAGE_KEYS.selectedInmate);

  if (typeof window !== "undefined") {
    window.location.assign(redirectTo);
  }
}
