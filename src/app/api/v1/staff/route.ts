import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listStaff, upsertStaff } from "@/lib/repositories";

export const runtime = "nodejs";

const staffSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(1),
  fullName: z.string().min(1),
  staffType: z.enum(["admin", "management", "lecturer", "clocking_officer"]),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  try {
    const staff = await listStaff();
    return apiOk({ staff });
  } catch (error) {
    return apiInternalError(error, "Failed to load staff.");
  }
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const parsed = staffSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid staff payload.", 400);
  }

  try {
    const payload = parsed.data;
    const staff = await upsertStaff(payload);
    return apiOk({ staff });
  } catch (error) {
    return apiInternalError(error, "Failed to save staff profile.");
  }
}
