import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiOk } from "@/lib/api/response";
import { listReports } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET() {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  try {
    const reports = await listReports();
    return apiOk({ reports });
  } catch (error) {
    return apiInternalError(error, "Failed to load reports.");
  }
}
