"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathForRole, roleHomePath, signOutRedirectPath } from "@/lib/auth";
import { clearSession, getSessionFromBrowser, persistSession } from "@/lib/auth-client";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import type { Role, UserSession } from "@/types/domain";

interface AppShellContextValue {
  session: UserSession | null;
  selectedInmateId: string;
  setActiveSession: (nextSession: UserSession) => void;
  signOut: (redirectTo?: string) => void;
  switchRole: (role: Role) => void;
  setSelectedInmateId: (studentId: string) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedInmateId, setSelectedInmateIdState] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSession(getSessionFromBrowser());
      setSelectedInmateIdState(browserStorage.loadState<string>(STORAGE_KEYS.selectedInmate) ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveSession = useCallback((nextSession: UserSession) => {
    persistSession(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(
    (redirectTo?: string) => {
      const currentRole = session?.role ?? getSessionFromBrowser()?.role ?? null;
      void fetch("/api/v1/auth/logout", {
        method: "POST",
      }).catch(() => null);
      clearSession();
      browserStorage.clearState(STORAGE_KEYS.selectedInmate);
      setSession(null);
      setSelectedInmateIdState("");
      router.push(redirectTo ?? signOutRedirectPath(currentRole));
    },
    [router, session],
  );

  const switchRole = useCallback(
    (role: Role) => {
      clearSession();
      browserStorage.clearState(STORAGE_KEYS.selectedInmate);
      setSession(null);
      setSelectedInmateIdState("");
      router.push(`${loginPathForRole(role)}?next=${encodeURIComponent(roleHomePath(role))}`);
    },
    [router],
  );

  const setSelectedInmateId = useCallback((studentId: string) => {
    browserStorage.saveState(STORAGE_KEYS.selectedInmate, studentId);
    setSelectedInmateIdState(studentId);
  }, []);

  const value = useMemo<AppShellContextValue>(
    () => ({
      session,
      selectedInmateId,
      setActiveSession,
      signOut,
      switchRole,
      setSelectedInmateId,
    }),
    [selectedInmateId, session, setActiveSession, setSelectedInmateId, signOut, switchRole],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return context;
}
