import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  createSessionFromCredential,
  demoCredentials,
  findDemoCredential,
  hasValidFacilityAccess,
  parseSerializedSession,
  serializeSession,
} from "@/lib/auth";

describe("auth helpers", () => {
  it("finds demo credentials with case-insensitive username", () => {
    const result = findDemoCredential("ADMIN", "Prison1234");
    expect(result?.role).toBe("admin");
  });

  it("creates and parses valid session payload", () => {
    const session = createSessionFromCredential(demoCredentials[0]);
    const parsed = parseSerializedSession(serializeSession(session));
    expect(parsed?.userId).toBe(session.userId);
    expect(parsed?.role).toBe("admin");
  });

  it("blocks expired sessions", () => {
    const encoded = encodeURIComponent(
      JSON.stringify({
        userId: "x",
        role: "admin",
        displayName: "Admin",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    );

    expect(parseSerializedSession(encoded)).toBeNull();
  });

  it("enforces role route access", () => {
    expect(canAccessPath("admin", "/admin/dashboard")).toBe(true);
    expect(canAccessPath("admin", "/inmate/dashboard")).toBe(false);
  });

  it("requires facility access grant for inmate session", () => {
    const session = createSessionFromCredential(demoCredentials[2]);
    expect(hasValidFacilityAccess(session)).toBe(false);

    const now = new Date().toISOString();
    expect(hasValidFacilityAccess({ ...session, facilityEntryGrantedAt: now })).toBe(true);
  });

  it("does not require facility access grant for admin and management sessions", () => {
    const adminSession = createSessionFromCredential(demoCredentials[0]);
    const managementSession = createSessionFromCredential(demoCredentials[1]);
    expect(hasValidFacilityAccess(adminSession)).toBe(true);
    expect(hasValidFacilityAccess(managementSession)).toBe(true);
  });
});
