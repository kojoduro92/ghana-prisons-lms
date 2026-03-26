import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiOk } from "@/lib/api/response";
import { listClockinSessions } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["clocking_officer", "admin", "management"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  try {
    const sessions = await listClockinSessions(status === "active" || status === "closed" ? status : undefined);
    return apiOk({ sessions });
  } catch (error) {
    return apiInternalError(error, "Failed to load access sessions.");
  }
}
