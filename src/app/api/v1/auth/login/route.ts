import { z } from "zod";
import { apiInternalError } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { createSessionFromCredential, findDemoCredential, roleHomePath } from "@/lib/auth";
import { listClockinSessions } from "@/lib/repositories";
import { validateSameOrigin } from "@/lib/security/csrf";
import { setServerSessionCookies } from "@/lib/server-session";

export const runtime = "nodejs";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function POST(request: Request) {
  const csrfError = validateSameOrigin(request);
  if (csrfError) {
    return apiError("CSRF_INVALID", csrfError, 403);
  }

  let payload: z.infer<typeof loginSchema>;
  try {
    payload = loginSchema.parse(await request.json());
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid login payload.", 400);
  }

  const credential = findDemoCredential(payload.username, payload.password);
  if (!credential) {
    return apiError("AUTH_INVALID_CREDENTIALS", "Invalid credentials.", 401);
  }

  try {
    const session = createSessionFromCredential(credential);
    if (credential.role === "inmate" && credential.studentId) {
      const activeSessions = await listClockinSessions("active");
      const latestSession = activeSessions.find((entry) => entry.studentId === credential.studentId);
      if (latestSession) {
        const accessExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        session.facilityAccess = {
          grantedAt: latestSession.clockInAt,
          method: latestSession.verifiedBy,
          location: latestSession.room,
          deviceId: latestSession.deviceSerialId,
          expiresAt: accessExpiresAt,
        };
        session.facilityEntryGrantedAt = latestSession.clockInAt;
        session.facilityEntryMethod = latestSession.verifiedBy;
        session.facilitySessionId = latestSession.id;
        session.facilityLocation = latestSession.room;
        session.allocatedDeviceType = latestSession.deviceType;
      } else {
        // Inmate portal login should open dashboard immediately without a second verification screen.
        const grantedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        session.facilityAccess = {
          grantedAt,
          method: "fingerprint",
          location: "Inmate Learning Portal",
          deviceId: "PORTAL-ACCESS",
          expiresAt,
        };
        session.facilityEntryGrantedAt = grantedAt;
        session.facilityEntryMethod = "fingerprint";
        session.facilityLocation = "Inmate Learning Portal";
      }
    }
    await setServerSessionCookies(session);

    return apiOk({
      session: {
        userId: session.userId,
        displayName: session.displayName,
        role: session.role,
        studentId: session.studentId ?? null,
        facilityAccess: session.facilityAccess ?? null,
        facility_access: session.facilityAccess
          ? {
              granted_at: session.facilityAccess.grantedAt,
              method: session.facilityAccess.method,
              location: session.facilityAccess.location,
              device_id: session.facilityAccess.deviceId,
              expires_at: session.facilityAccess.expiresAt,
            }
          : null,
        expiresAt: session.expiresAt,
      },
      redirectTo: payload.next || roleHomePath(credential.role),
      requiresVerification: false,
    });
  } catch (error) {
    return apiInternalError(error, "Unable to start session.");
  }
}
