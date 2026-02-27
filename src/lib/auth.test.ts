import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  createSessionFromCredential,
  demoCredentials,
  findDemoCredential,
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
});
