import type { Role, UserSession } from "@/types/domain";

export const AUTH_COOKIE_NAME = "gplp_session";
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
  return "/inmate/dashboard";
}

export function routeRoleFromPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/management")) return "management";
  if (pathname.startsWith("/inmate")) return "inmate";
  return null;
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

export function parseSerializedSession(raw: string | undefined): UserSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as UserSession;
    if (!parsed.role || !parsed.userId || !parsed.expiresAt) {
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function hasValidFacilityAccess(session: UserSession, nowMs = Date.now()): boolean {
  if (session.role !== "inmate") {
    return true;
  }

  if (!session.facilityEntryGrantedAt) {
    return false;
  }

  const grantedAt = new Date(session.facilityEntryGrantedAt).getTime();
  if (!Number.isFinite(grantedAt)) {
    return false;
  }

  if (grantedAt > nowMs) {
    return false;
  }

  return nowMs - grantedAt <= FACILITY_ACCESS_WINDOW_SECONDS * 1000;
}
