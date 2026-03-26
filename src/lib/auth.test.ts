import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  createSessionFromCredential,
  demoCredentials,
  findDemoCredential,
  hasValidFacilityAccess,
  loginPathForPath,
  loginPathForRole,
  parseSerializedSession,
  serializeSession,
  signOutRedirectPath,
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

  it("maps roles and protected paths to the correct login interfaces", () => {
    expect(loginPathForRole("admin")).toBe("/auth/login");
    expect(loginPathForRole("inmate")).toBe("/auth/inmate-login");
    expect(loginPathForRole("clocking_officer")).toBe("/auth/clockin-login");

    expect(loginPathForPath("/inmate/dashboard")).toBe("/auth/inmate-login");
    expect(loginPathForPath("/clockin/checkin")).toBe("/auth/clockin-login");
    expect(loginPathForPath("/admin/dashboard")).toBe("/auth/login");
  });

  it("maps sign-out redirects by role", () => {
    expect(signOutRedirectPath("admin")).toBe("/access");
    expect(signOutRedirectPath("management")).toBe("/access");
    expect(signOutRedirectPath("lecturer")).toBe("/access");
    expect(signOutRedirectPath("clocking_officer")).toBe("/access");
    expect(signOutRedirectPath("inmate")).toBe("/landing");
    expect(signOutRedirectPath(null)).toBe("/access");
  });

  it("requires facility access grant for inmate session", () => {
    const inmateCredential = demoCredentials.find((item) => item.role === "inmate");
    expect(inmateCredential).toBeTruthy();
    const session = createSessionFromCredential(inmateCredential!);
    expect(hasValidFacilityAccess(session)).toBe(false);

    const now = new Date().toISOString();
    expect(hasValidFacilityAccess({ ...session, facilityEntryGrantedAt: now })).toBe(true);
  });

  it("accepts new facilityAccess payload contract for inmates", () => {
    const inmateCredential = demoCredentials.find((item) => item.role === "inmate");
    expect(inmateCredential).toBeTruthy();
    const session = createSessionFromCredential(inmateCredential!);
    const now = Date.now();
    expect(
      hasValidFacilityAccess({
        ...session,
        facilityAccess: {
          grantedAt: new Date(now - 2 * 60 * 1000).toISOString(),
          method: "fingerprint",
          location: "Hall A",
          deviceId: "DEV-001",
          expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
        },
      }),
    ).toBe(true);
  });

  it("does not require facility access grant for admin and management sessions", () => {
    const adminSession = createSessionFromCredential(demoCredentials[0]);
    const managementSession = createSessionFromCredential(demoCredentials[1]);
    expect(hasValidFacilityAccess(adminSession)).toBe(true);
    expect(hasValidFacilityAccess(managementSession)).toBe(true);
  });
});
