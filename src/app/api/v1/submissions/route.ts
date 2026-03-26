import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { createSubmission, listSubmissions } from "@/lib/repositories";

export const runtime = "nodejs";

const submissionSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  submittedAt: z.string(),
  score: z.number().int().min(0).max(100).optional(),
  feedback: z.string().optional(),
  gradedBy: z.string().optional(),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const assignmentId = url.searchParams.get("assignmentId") ?? undefined;
  try {
    const submissions = await listSubmissions(assignmentId);
    const visibleSubmissions =
      guard.session.role === "inmate"
        ? submissions.filter((entry) => entry.studentId === guard.session.studentId)
        : submissions;
    return apiOk({ submissions: visibleSubmissions });
  } catch (error) {
    return apiInternalError(error, "Failed to load submissions.");
  }
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
    request,
    csrf: true,
  });
  if ("response" in guard) return guard.response;

  const parsed = submissionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid submission payload.", 400);
  }

  if (guard.session.role === "inmate" && guard.session.studentId && parsed.data.studentId !== guard.session.studentId) {
    return apiError("AUTH_FORBIDDEN", "Inmates can submit only for their own student profile.", 403);
  }

  try {
    const payload = parsed.data;
    const submission = await createSubmission(payload);
    return apiOk({ submission });
  } catch (error) {
    return apiInternalError(error, "Failed to save submission.");
  }
}
