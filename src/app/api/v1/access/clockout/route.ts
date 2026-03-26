import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { closeClockinSession, createAttendance } from "@/lib/repositories";
import { appendAuditEvent } from "@/lib/security-audit";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["clocking_officer", "admin", "management"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  let payload: z.infer<typeof checkoutSchema>;
  try {
    payload = checkoutSchema.parse(await request.json());
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid clock-out payload.", 400);
  }

  try {
    const updated = await closeClockinSession(payload.sessionId);
    if (!updated) {
      return apiError("NOT_FOUND", "Session not found.", 404);
    }

    await createAttendance({
      studentId: updated.studentId,
      type: "exit",
      facility: updated.room,
      timestamp: new Date().toISOString(),
      verifiedBy: updated.verifiedBy,
    });

    await appendAuditEvent({
      action: "access-clockout",
      actor: guard.session.displayName,
      result: "success",
      target: updated.id,
      details: `student=${updated.studentId}, room=${updated.room}, device=${updated.deviceSerialId}`,
    });

    return apiOk({
      clockedOut: true,
      session: updated,
    });
  } catch (error) {
    return apiInternalError(error, "Failed to close clock-in session.");
  }
}
