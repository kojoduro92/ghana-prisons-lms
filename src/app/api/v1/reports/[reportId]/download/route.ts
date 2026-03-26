import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError } from "@/lib/api/response";
import { listReports } from "@/lib/repositories";

export const runtime = "nodejs";

function contentTypeForExtension(fileName: string): string {
  if (fileName.endsWith(".csv")) return "text/csv";
  if (fileName.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (fileName.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function GET(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const { reportId } = await context.params;
  try {
    const reports = await listReports();
    const record = reports.find((entry) => entry.id === reportId);
    if (!record?.filePath || !record.fileName) {
      return apiError("NOT_FOUND", "Report export not found.", 404);
    }

    const absolutePath = path.resolve(record.filePath);
    const file = await readFile(absolutePath);
    return new Response(file, {
      status: 200,
      headers: {
        "content-type": contentTypeForExtension(record.fileName),
        "content-disposition": `attachment; filename="${record.fileName}"`,
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return apiError("FILE_NOT_FOUND", "Report file missing on local storage.", 404);
    }
    return apiInternalError(error, "Failed to download report.");
  }
}
