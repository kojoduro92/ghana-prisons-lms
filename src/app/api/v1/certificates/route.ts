import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { createCertificate, listCertificates } from "@/lib/repositories";

export const runtime = "nodejs";

const certificateSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  issuedBy: z.string().min(1),
  note: z.string().optional(),
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
    const certificates = await listCertificates(studentId);
    return apiOk({ certificates });
  } catch (error) {
    return apiInternalError(error, "Failed to load certificates.");
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

  const parsed = certificateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid certificate payload.", 400);
  }

  try {
    const payload = parsed.data;
    const certificate = await createCertificate(payload);
    return apiOk({ certificate });
  } catch (error) {
    return apiInternalError(error, "Failed to issue certificate.");
  }
}
