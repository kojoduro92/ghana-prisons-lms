import { apiError } from "@/lib/api/response";
import { authorizeApiRequest } from "@/lib/api/guards";
import { getAssignmentById } from "@/lib/repositories";
import { readStoredFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
  });
  if ("response" in guard) return guard.response;

  const { assignmentId } = await params;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment?.attachmentPath || !assignment.attachmentFileName || !assignment.attachmentMimeType) {
    return apiError("NOT_FOUND", "Assignment attachment not found.", 404);
  }

  try {
    const file = await readStoredFile(assignment.attachmentPath);
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "content-type": assignment.attachmentMimeType,
        "content-disposition": `attachment; filename="${assignment.attachmentFileName}"`,
      },
    });
  } catch {
    return apiError("FILE_NOT_FOUND", "Stored assignment attachment could not be read.", 404);
  }
}
