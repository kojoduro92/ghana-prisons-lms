import { apiError, apiOk } from "@/lib/api/response";
import { getServerSession } from "@/lib/server-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return apiError("AUTH_UNAUTHORIZED", "Session not found or expired.", 401);
  }

  const facilityAccess =
    session.facilityAccess ??
    (session.facilityEntryGrantedAt
      ? {
          grantedAt: session.facilityEntryGrantedAt,
          method: session.facilityEntryMethod ?? session.lastBiometricMethod ?? "fingerprint",
          location: session.facilityLocation ?? "Digital Learning Lab",
          deviceId: session.facilitySessionId ?? "unassigned",
          expiresAt: new Date(new Date(session.facilityEntryGrantedAt).getTime() + 8 * 60 * 60 * 1000).toISOString(),
        }
      : null);

  return apiOk({
    userId: session.userId,
    displayName: session.displayName,
    role: session.role,
    studentId: session.studentId ?? null,
    facilityAccess,
    facility_access: facilityAccess
      ? {
          granted_at: facilityAccess.grantedAt,
          method: facilityAccess.method,
          location: facilityAccess.location,
          device_id: facilityAccess.deviceId,
          expires_at: facilityAccess.expiresAt,
        }
      : null,
    expiresAt: session.expiresAt,
  });
}
