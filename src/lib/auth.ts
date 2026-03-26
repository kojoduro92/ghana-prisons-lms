import type { Role, UserSession } from "@/types/domain";

export const AUTH_COOKIE_NAME = "gplp_session";
export const AUTH_COOKIE_LEGACY_NAME = "gplp_session_legacy";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;
export const FACILITY_ACCESS_WINDOW_SECONDS = 60 * 60 * 8;

export interface DemoCredential {
  username: string;
  password: string;
  role: Role;
  displayName: string;
  userId: string;
  studentId?: string;
}

export const demoCredentials: DemoCredential[] = [
  {
    username: "admin",
    password: "Prison1234",
    role: "admin",
    displayName: "Admin Officer",
    userId: "admin-001",
  },
  {
    username: "manager",
    password: "Prison1234",
    role: "management",
    displayName: "Command Staff",
    userId: "mgr-001",
  },
  {
    username: "lecturer",
    password: "Prison1234",
    role: "lecturer",
    displayName: "Samuel Appiah",
    userId: "lect-001",
  },
  {
    username: "officer",
    password: "Prison1234",
    role: "clocking_officer",
    displayName: "Clocking Officer",
    userId: "officer-001",
  },
  {
    username: "GP-10234",
    password: "Prison1234",
    role: "inmate",
    displayName: "John Mensah",
    userId: "inmate-001",
    studentId: "GP-10234",
  },
];

export function roleHomePath(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "management") return "/management/dashboard";
  if (role === "lecturer") return "/lecturer/dashboard";
  if (role === "clocking_officer") return "/clockin/checkin";
  return "/inmate/dashboard";
}

export function signOutRedirectPath(role: Role | null | undefined): string {
  return role === "inmate" ? "/landing" : "/access";
}

export function loginPathForRole(role: Role): string {
  if (role === "inmate") return "/auth/inmate-login";
  if (role === "clocking_officer") return "/auth/clockin-login";
  return "/auth/login";
}

export function routeRoleFromPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/management")) return "management";
  if (pathname.startsWith("/lecturer")) return "lecturer";
  if (pathname.startsWith("/clockin")) return "clocking_officer";
  if (pathname.startsWith("/inmate")) return "inmate";
  return null;
}

export function loginPathForPath(pathname: string): string {
  const role = routeRoleFromPath(pathname);
  if (!role) return "/auth/login";
  return loginPathForRole(role);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const requiredRole = routeRoleFromPath(pathname);
  if (!requiredRole) return true;
  return requiredRole === role;
}

export function findDemoCredential(username: string, password: string): DemoCredential | null {
  return (
    demoCredentials.find(
      (entry) => entry.username.toLowerCase() === username.trim().toLowerCase() && entry.password === password,
    ) ?? null
  );
}

export function createSessionFromCredential(credential: DemoCredential): UserSession {
  return {
    userId: credential.userId,
    role: credential.role,
    displayName: credential.displayName,
    studentId: credential.studentId,
    expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString(),
  };
}

export function serializeSession(session: UserSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function normalizeSessionPayload(parsed: UserSession): UserSession | null {
  if (!parsed.role || !parsed.userId || !parsed.expiresAt) {
    return null;
  }

  if (new Date(parsed.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return parsed;
}

export function parseSerializedSession(raw: string | undefined): UserSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as UserSession;
    return normalizeSessionPayload(parsed);
  } catch {
    return null;
  }
}

export function hasValidFacilityAccess(session: UserSession, nowMs = Date.now()): boolean {
  if (session.role !== "inmate") {
    return true;
  }

  const grantedAtRaw = session.facilityAccess?.grantedAt ?? session.facilityEntryGrantedAt;
  if (!grantedAtRaw) {
    return false;
  }

  const grantedAt = new Date(grantedAtRaw).getTime();
  if (!Number.isFinite(grantedAt)) {
    return false;
  }

  if (grantedAt > nowMs) {
    return false;
  }

  const expiresAtRaw = session.facilityAccess?.expiresAt;
  if (expiresAtRaw) {
    const expiresAt = new Date(expiresAtRaw).getTime();
    if (!Number.isFinite(expiresAt)) {
      return false;
    }
    return expiresAt >= nowMs;
  }

  return nowMs - grantedAt <= FACILITY_ACCESS_WINDOW_SECONDS * 1000;
}
