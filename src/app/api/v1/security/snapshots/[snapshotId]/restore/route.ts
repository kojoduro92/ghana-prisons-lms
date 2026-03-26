import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listDomainState, restoreDomainStateFromSnapshot } from "@/lib/repositories";
import { appendAuditEvent } from "@/lib/security-audit";
import { getStateSnapshot } from "@/lib/state-snapshot-repository";

export const runtime = "nodejs";

const restoreSchema = z.object({
  confirmationPhrase: z.string().trim(),
});

const REQUIRED_PHRASE = "RESTORE SNAPSHOT";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const payload = restoreSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return apiError("VALIDATION_ERROR", "Invalid restore payload.", 400);
  }

  if (payload.data.confirmationPhrase.toUpperCase() !== REQUIRED_PHRASE) {
    return apiError("VALIDATION_ERROR", `Confirmation phrase must be '${REQUIRED_PHRASE}'.`, 400);
  }

  try {
    const { snapshotId } = await context.params;
    const snapshot = await getStateSnapshot(snapshotId);
    if (!snapshot) {
      return apiError("NOT_FOUND", "Snapshot not found.", 404);
    }

    const before = await listDomainState();
    const restored = await restoreDomainStateFromSnapshot(snapshot.state);

    await appendAuditEvent({
      action: "state-snapshot-restored",
      actor: guard.session.displayName,
      result: "success",
      target: snapshot.id,
      details: `Before enrollments=${before.enrollments.length}, after enrollments=${restored.enrollments.length}`,
    });

    return apiOk({
      restored: true,
      snapshot: {
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        actor: snapshot.actor,
        checksum: snapshot.checksum,
      },
      counts: {
        inmates: restored.inmates.length,
        staff: restored.staff.length,
        courses: restored.courses.length,
        enrollments: restored.enrollments.length,
        assignments: restored.assignments.length,
        submissions: restored.submissions.length,
        certificates: restored.certificates.length,
        attendance: restored.attendance.length,
        reports: restored.reports.length,
        clockinSessions: restored.clockinSessions.length,
      },
    });
  } catch (error) {
    return apiInternalError(error, "Failed to restore snapshot.");
  }
}
