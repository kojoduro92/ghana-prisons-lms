import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { createAssignment, listAssignments } from "@/lib/repositories";
import { assertAssignmentAttachmentFile, persistUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

const assignmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  dueAt: z.string().optional(),
  gradingMode: z.enum(["manual", "auto"]).optional(),
  answerKey: z.string().optional(),
  createdBy: z.string().optional(),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? undefined;
  try {
    const assignments = await listAssignments(courseId);
    return apiOk({ assignments });
  } catch (error) {
    return apiInternalError(error, "Failed to load assignments.");
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

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let payload: z.infer<typeof assignmentSchema>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = assignmentSchema.parse({
        courseId: `${formData.get("courseId") ?? ""}`.trim(),
        title: `${formData.get("title") ?? ""}`.trim(),
        dueAt: `${formData.get("dueAt") ?? ""}`.trim() || undefined,
        gradingMode: `${formData.get("gradingMode") ?? ""}`.trim() || undefined,
        answerKey: `${formData.get("answerKey") ?? ""}`.trim() || undefined,
        createdBy: guard.session.displayName,
      });

      const fileEntry = formData.get("attachment");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        const attachmentFile = assertAssignmentAttachmentFile(fileEntry);
        const assignmentId = `ASG-${randomUUID()}`;
        const stored = await persistUploadedFile(attachmentFile, `data/uploads/assignments/${assignmentId}`);
        const assignment = await createAssignment({
          id: assignmentId,
          ...payload,
          attachmentFileName: stored.fileName,
          attachmentMimeType: stored.mimeType,
          attachmentSizeBytes: stored.fileSizeBytes,
          attachmentPath: stored.storagePath,
        });
        return apiOk({ assignment });
      }
    } else {
      const parsed = assignmentSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) {
        return apiError("VALIDATION_ERROR", "Invalid assignment payload.", 400);
      }
      payload = parsed.data;
    }

    const assignment = await createAssignment(payload);
    return apiOk({ assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid assignment payload.", 400);
    }
    const message = error instanceof Error ? error.message : "Failed to create assignment.";
    return apiInternalError(error, message);
  }
}
