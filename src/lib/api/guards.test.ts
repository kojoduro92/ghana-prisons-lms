import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSession } from "@/types/domain";
import { authorizeApiRequest } from "@/lib/api/guards";

const { getServerSessionMock, validateSameOriginMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn<() => Promise<UserSession | null>>(),
  validateSameOriginMock: vi.fn<(request: Request) => string | null>(),
}));

vi.mock("@/lib/server-session", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/security/csrf", () => ({
  validateSameOrigin: validateSameOriginMock,
}));

function buildSession(overrides?: Partial<UserSession>): UserSession {
  return {
    userId: "user-1",
    role: "admin",
    displayName: "Admin User",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe("authorizeApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateSameOriginMock.mockReturnValue(null);
  });

  it("blocks when no session exists", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const result = await authorizeApiRequest({ roles: ["admin"] });
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
    }
  });

  it("blocks when role is not allowed", async () => {
    getServerSessionMock.mockResolvedValue(buildSession({ role: "lecturer" }));
    const result = await authorizeApiRequest({ roles: ["admin"] });
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(403);
    }
  });

  it("blocks inmate when facility access has expired", async () => {
    getServerSessionMock.mockResolvedValue(
      buildSession({
        role: "inmate",
        studentId: "GP-10234",
        facilityAccess: {
          grantedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          method: "fingerprint",
          location: "Hall A",
          deviceId: "DEV-1",
          expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      }),
    );

    const result = await authorizeApiRequest({ roles: ["inmate"] });
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(403);
    }
  });

  it("enforces CSRF for state-changing calls when enabled", async () => {
    getServerSessionMock.mockResolvedValue(buildSession());
    validateSameOriginMock.mockReturnValue("CSRF origin mismatch.");

    const result = await authorizeApiRequest({
      roles: ["admin"],
      request: new Request("http://localhost:3010/api/v1/inmates", { method: "POST" }),
      csrf: true,
      requireFacilityAccessForInmate: false,
    });
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns the active session when checks pass", async () => {
    const session = buildSession({ role: "management" });
    getServerSessionMock.mockResolvedValue(session);

    const result = await authorizeApiRequest({
      roles: ["admin", "management"],
      requireFacilityAccessForInmate: false,
    });
    expect("session" in result).toBe(true);
    if ("session" in result) {
      expect(result.session.role).toBe("management");
    }
  });
});
