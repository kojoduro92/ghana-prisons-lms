import { apiError } from "@/lib/api/response";
import { authorizeApiRequest } from "@/lib/api/guards";
import { getCourseMaterialById } from "@/lib/repositories";
import { readStoredFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer", "inmate"],
  });
  if ("response" in guard) return guard.response;

  const { materialId } = await params;
  const material = await getCourseMaterialById(materialId);
  if (!material) {
    return apiError("NOT_FOUND", "Course material not found.", 404);
  }

  try {
    const file = await readStoredFile(material.storagePath);
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "content-type": material.mimeType,
        "content-disposition": `attachment; filename="${material.fileName}"`,
      },
    });
  } catch {
    return apiError("FILE_NOT_FOUND", "Stored course material could not be read.", 404);
  }
}
