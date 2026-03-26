import path from "node:path";
import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { createReportRecord, listDomainState } from "@/lib/repositories";
import { writeCsv, writePdf, writeXlsx } from "@/lib/report-exports";

export const runtime = "nodejs";

const generateSchema = z.object({
  reportType: z.enum(["attendance", "performance", "course-effectiveness", "operational-summary", "executive-pack"]),
  format: z.enum(["csv", "xlsx", "pdf"]),
  generatedBy: z.string().min(1).optional(),
});

function buildRows(reportType: z.infer<typeof generateSchema>["reportType"], state: Awaited<ReturnType<typeof listDomainState>>) {
  if (reportType === "attendance") return state.attendance;
  if (reportType === "performance") return state.enrollments;
  if (reportType === "course-effectiveness") return state.courses;
  if (reportType === "operational-summary") return state.clockinSessions;
  return [
    {
      inmates: state.inmates.length,
      staff: state.staff.length,
      courses: state.courses.length,
      enrollments: state.enrollments.length,
      reports: state.reports.length,
      generatedAt: new Date().toISOString(),
    },
  ];
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management", "lecturer"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  let payload: z.infer<typeof generateSchema>;
  try {
    payload = generateSchema.parse(await request.json());
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid report payload.", 400);
  }

  try {
    const state = await listDomainState();
    const rows = buildRows(payload.reportType, state);
    const fileName = `gplp-${payload.reportType}-${Date.now()}.${payload.format}`;
    let filePath = "";

    if (payload.format === "csv") {
      filePath = await writeCsv(fileName, rows as Array<Record<string, unknown>>);
    } else if (payload.format === "xlsx") {
      filePath = await writeXlsx(fileName, rows as Array<Record<string, unknown>>);
    } else {
      filePath = await writePdf(fileName, `GPLP ${payload.reportType} report`, rows as Array<Record<string, unknown>>);
    }

    const record = await createReportRecord({
      type: payload.reportType,
      generatedBy: guard.session.displayName,
      format: payload.format,
      fileName,
      filePath,
      status: "completed",
      rowCount: rows.length,
    });

    return apiOk({
      report: record,
      downloadUrl: `/api/v1/reports/${record.id}/download`,
      absolutePath: path.resolve(filePath),
    });
  } catch (error) {
    return apiInternalError(error, "Failed to generate report.");
  }
}
