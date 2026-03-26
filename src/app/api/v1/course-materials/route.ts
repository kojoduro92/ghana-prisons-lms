import { apiError, apiOk } from "@/lib/api/response";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { createCourseMaterial, listCourseMaterials } from "@/lib/repositories";
import { assertCourseMaterialFile, inferCourseMaterialKind, persistUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? undefined;

  try {
    const materials = await listCourseMaterials(courseId);
    return apiOk({ materials });
  } catch (error) {
    return apiInternalError(error, "Failed to load course materials.");
  }
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "lecturer"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  try {
    const formData = await request.formData();
    const courseId = `${formData.get("courseId") ?? ""}`.trim();
    if (!courseId) {
      return apiError("VALIDATION_ERROR", "Course ID is required.", 400);
    }

    const file = assertCourseMaterialFile(formData.get("file"));
    const stored = await persistUploadedFile(file, `data/uploads/course-materials/${courseId}`);
    const title = `${formData.get("title") ?? ""}`.trim() || file.name;
    const material = await createCourseMaterial({
      courseId,
      title,
      kind: inferCourseMaterialKind(file.name),
      mimeType: stored.mimeType,
      fileName: stored.fileName,
      fileSizeBytes: stored.fileSizeBytes,
      storagePath: stored.storagePath,
      uploadedBy: guard.session.displayName,
    });

    return apiOk({ material });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload course material.";
    return apiError("UPLOAD_FAILED", message, 400);
  }
}
