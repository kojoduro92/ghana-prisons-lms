import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listAuditEvents } from "@/lib/security-audit";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(120),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid audit query.", 400);
  }

  try {
    const records = await listAuditEvents();
    return apiOk({
      events: records.slice(0, parsed.data.limit),
      total: records.length,
    });
  } catch (error) {
    return apiInternalError(error, "Failed to load security audit events.");
  }
}
