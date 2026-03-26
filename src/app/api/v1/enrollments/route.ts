import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listEnrollments, upsertEnrollment } from "@/lib/repositories";

export const runtime = "nodejs";

const enrollmentSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  progressPercent: z.number().min(0).max(100),
  status: z.enum(["In Progress", "Completed"]),
  timeSpentMinutes: z.number().int().nonnegative().optional(),
  lessonsCompleted: z.number().int().nonnegative().optional(),
  assessmentsTaken: z.number().int().nonnegative().optional(),
  latestAssessmentScore: z.number().int().min(0).max(100).optional(),
  lastActivityAt: z.string().optional(),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const studentId =
    guard.session.role === "inmate" ? (guard.session.studentId ?? undefined) : (url.searchParams.get("studentId") ?? undefined);
  try {
    const enrollments = await listEnrollments(studentId);
    return apiOk({ enrollments });
  } catch (error) {
    return apiInternalError(error, "Failed to load enrollments.");
  }
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const parsed = enrollmentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid enrollment payload.", 400);
  }

  try {
    const payload = parsed.data;
    const enrollment = await upsertEnrollment(payload);
    return apiOk({ enrollment });
  } catch (error) {
    return apiInternalError(error, "Failed to save enrollment.");
  }
}
