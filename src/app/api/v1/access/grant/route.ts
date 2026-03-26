import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { getLatestVerification } from "@/lib/biometric-repository";
import { createAttendance, createClockinSession } from "@/lib/repositories";
import { appendAuditEvent } from "@/lib/security-audit";
import { verifyVerificationToken } from "@/lib/verification-token";

export const runtime = "nodejs";
const MAX_VERIFICATION_AGE_MS = 10 * 60 * 1000;

const grantSchema = z.object({
  studentId: z.string().min(1),
  officerId: z.string().optional(),
  room: z.string().min(1),
  deviceType: z.enum(["Desktop PC", "Laptop", "Tablet"]),
  deviceSerialId: z.string().min(1),
  verifiedBy: z.enum(["fingerprint", "face"]),
  proof: z.enum(["camera-face", "device-biometric", "simulated"]).default("simulated"),
  verificationToken: z.string().min(16).optional(),
});

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["clocking_officer", "admin", "management"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  let payload: z.infer<typeof grantSchema>;
  try {
    payload = grantSchema.parse(await request.json());
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid grant payload.", 400);
  }

  try {
    const latestVerification = await getLatestVerification(payload.studentId, {
      deviceId: payload.deviceSerialId,
      method: payload.verifiedBy,
      result: "success",
    });
    let verificationContext = latestVerification;
    if (verificationContext) {
      const verifiedAt = new Date(verificationContext.verifiedAt).getTime();
      if (!Number.isFinite(verifiedAt) || Date.now() - verifiedAt > MAX_VERIFICATION_AGE_MS) {
        verificationContext = null;
      }
    }

    if (!verificationContext && payload.verificationToken) {
      const token = verifyVerificationToken(payload.verificationToken);
      if (token) {
        const fresh = Date.now() - token.verifiedAt <= MAX_VERIFICATION_AGE_MS;
        const sameSubject =
          token.studentId === payload.studentId &&
          token.deviceId === payload.deviceSerialId &&
          token.method === payload.verifiedBy &&
          token.proof === payload.proof;
        if (fresh && sameSubject) {
          verificationContext = {
            id: token.nonce,
            studentId: token.studentId,
            method: token.method,
            result: "success",
            verifiedAt: new Date(token.verifiedAt).toISOString(),
            deviceId: token.deviceId,
            proof: token.proof,
            strictMode: false,
          };
        }
      }
    }

    if (!verificationContext) {
      return apiError(
        "VERIFICATION_REQUIRED",
        "Successful biometric verification is required before access grant.",
        409,
      );
    }

    const session = await createClockinSession({
      studentId: payload.studentId,
      officerId: payload.officerId,
      room: payload.room,
      deviceType: payload.deviceType,
      deviceSerialId: payload.deviceSerialId,
      verifiedBy: payload.verifiedBy,
      proof: payload.proof,
    });

    await createAttendance({
      studentId: payload.studentId,
      type: "entry",
      facility: payload.room,
      timestamp: new Date().toISOString(),
      verifiedBy: payload.verifiedBy,
    });

    await appendAuditEvent({
      action: "access-granted",
      actor: guard.session.displayName,
      result: "success",
      target: session.id,
      details: `student=${payload.studentId}, room=${payload.room}, device=${payload.deviceSerialId}`,
    });

    return apiOk({
      granted: true,
      session,
      verification: {
        id: verificationContext.id,
        verifiedAt: verificationContext.verifiedAt,
        method: verificationContext.method,
        deviceId: verificationContext.deviceId,
      },
    });
  } catch (error) {
    return apiInternalError(error, "Failed to grant facility access.");
  }
}
