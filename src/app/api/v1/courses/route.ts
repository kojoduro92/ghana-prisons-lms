import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listCourses, upsertCourse } from "@/lib/repositories";

export const runtime = "nodejs";

const courseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  instructor: z.string().min(1),
  rating: z.number().min(0).max(5),
  thumbnail: z.string().min(1),
  summary: z.string().optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  durationHours: z.number().int().positive().optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  updatedAt: z.string().optional(),
});

export async function GET() {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate", "clocking_officer"],
  });
  if ("response" in guard) return guard.response;

  try {
    const courses = await listCourses();
    return apiOk({ courses });
  } catch (error) {
    return apiInternalError(error, "Failed to load courses.");
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

  const parsed = courseSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid course payload.", 400);
  }

  try {
    const payload = parsed.data;
    const course = await upsertCourse(payload);
    return apiOk({ course });
  } catch (error) {
    return apiInternalError(error, "Failed to save course.");
  }
}
