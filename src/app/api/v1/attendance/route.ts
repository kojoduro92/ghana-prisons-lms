import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { createAttendance, listAttendance } from "@/lib/repositories";

export const runtime = "nodejs";

const attendanceSchema = z.object({
  studentId: z.string().min(1),
  type: z.enum(["entry", "exit"]),
  facility: z.string().min(1),
  timestamp: z.string(),
  verifiedBy: z.enum(["fingerprint", "face"]),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "clocking_officer"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId") ?? undefined;
  try {
    const attendance = await listAttendance(studentId);
    return apiOk({ attendance });
  } catch (error) {
    return apiInternalError(error, "Failed to load attendance records.");
  }
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "clocking_officer"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const parsed = attendanceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid attendance payload.", 400);
  }

  try {
    const payload = parsed.data;
    const record = await createAttendance(payload);
    return apiOk({ attendance: record });
  } catch (error) {
    return apiInternalError(error, "Failed to create attendance record.");
  }
}
