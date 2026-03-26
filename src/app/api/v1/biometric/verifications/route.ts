import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listClockinSessions } from "@/lib/repositories";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "clocking_officer"],
    request,
    csrf: false,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  let limit = 50;
  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      limit: url.searchParams.get("limit") ?? 50,
    });
    limit = parsed.limit;
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid query values.", 400);
  }

  try {
    const sessions = await listClockinSessions();
    const verifications = sessions
      .map((session) => ({
        id: `session-${session.id}`,
        studentId: session.studentId,
        method: session.verifiedBy,
        result: "success" as const,
        verifiedAt: session.clockInAt,
        deviceId: session.deviceSerialId,
        proof: session.proof,
        strictMode: false,
      }))
      .sort((left, right) => (left.verifiedAt < right.verifiedAt ? 1 : -1))
      .slice(0, limit);
    return apiOk({ verifications });
  } catch (error) {
    return apiInternalError(error, "Unable to load biometric verification logs.");
  }
}
