"use client";

import type { UserSession } from "@/types/domain";
import { AUTH_COOKIE_NAME, SESSION_DURATION_SECONDS, serializeSession } from "@/lib/auth";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";

export function persistSession(session: UserSession): void {
  if (typeof document === "undefined") return;

  const cookie = `${AUTH_COOKIE_NAME}=${serializeSession(session)}; path=/; max-age=${SESSION_DURATION_SECONDS}; samesite=lax`;
  document.cookie = cookie;
  browserStorage.saveState(STORAGE_KEYS.session, session);
}

export function clearSession(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
  }

  browserStorage.clearState(STORAGE_KEYS.session);
}

export function getSessionFromBrowser(): UserSession | null {
  return browserStorage.loadState<UserSession>(STORAGE_KEYS.session);
}
