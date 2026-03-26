import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { appendVerification } from "@/lib/biometric-repository";
import { appendAuditEvent } from "@/lib/security-audit";
import { createVerificationToken } from "@/lib/verification-token";

export const runtime = "nodejs";

const verifySchema = z.object({
  studentId: z.string().min(1),
  method: z.enum(["fingerprint", "face"]),
  deviceId: z.string().min(1),
  proof: z.enum(["camera-face", "device-biometric", "simulated"]).default("simulated"),
  strictMode: z.boolean().default(false),
  forceResult: z.enum(["success", "failed"]).optional(),
});

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["clocking_officer", "admin", "management"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  let payload: z.infer<typeof verifySchema>;
  try {
    payload = verifySchema.parse(await request.json());
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid verification payload.", 400);
  }

  try {
    const result = payload.forceResult ?? "success";
    let record:
      | Awaited<ReturnType<typeof appendVerification>>
      | null = null;

    try {
      record = await appendVerification({
        studentId: payload.studentId,
        method: payload.method,
        result,
        deviceId: payload.deviceId,
        proof: payload.proof,
        strictMode: payload.strictMode,
      });
    } catch (error) {
      console.warn("[access-verify] verification store unavailable, continuing with signed token:", error);
    }

    try {
      await appendAuditEvent({
        action: "biometric-verification",
        actor: guard.session.displayName,
        result,
        target: payload.studentId,
        details: `method=${payload.method}, proof=${payload.proof}, device=${payload.deviceId}`,
      });
    } catch (error) {
      console.warn("[access-verify] audit store unavailable:", error);
    }

    const verificationToken = createVerificationToken({
      studentId: payload.studentId,
      method: payload.method,
      deviceId: payload.deviceId,
      proof: payload.proof,
      verifiedAt: Date.now(),
      nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });

    return apiOk({
      verified: result === "success",
      record,
      verificationToken,
    });
  } catch (error) {
    return apiInternalError(error, "Failed to process verification.");
  }
}
