import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listInmates, upsertInmate } from "@/lib/repositories";

export const runtime = "nodejs";

const inmateSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  warrantName: z.string().min(1),
  warrantSerialNumber: z.string().min(1),
  prisonNumber: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  station: z.string().min(1),
  blockName: z.string().min(1),
  cellNumber: z.string().min(1),
  offense: z.string().min(1),
  sentence: z.string().min(1),
  educationBackground: z.string(),
  skillInterests: z.array(z.string()).default([]),
  blockAssignment: z.string(),
  biometricStatus: z.enum(["Enrolled", "Pending"]).default("Pending"),
  assignedPrison: z.string(),
});

export async function GET() {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "clocking_officer"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  try {
    const inmates = await listInmates();
    return apiOk({ inmates });
  } catch (error) {
    return apiInternalError(error, "Failed to load inmates.");
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

  const parsed = inmateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid inmate payload.", 400);
  }

  try {
    const payload = parsed.data;
    const inmate = await upsertInmate(payload);
    return apiOk({ inmate });
  } catch (error) {
    return apiInternalError(error, "Failed to save inmate.");
  }
}
