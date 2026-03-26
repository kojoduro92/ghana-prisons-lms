import { z } from "zod";
import { apiInternalError, authorizeApiRequest } from "@/lib/api/guards";
import { apiError, apiOk } from "@/lib/api/response";
import { listDomainState } from "@/lib/repositories";
import { appendAuditEvent } from "@/lib/security-audit";
import { createStateSnapshot, listStateSnapshots } from "@/lib/state-snapshot-repository";

export const runtime = "nodejs";

const snapshotBodySchema = z.object({
  note: z.string().trim().max(280).optional(),
});

const snapshotQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(120).default(30),
});

export async function GET(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management"],
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const parsed = snapshotQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid snapshot query.", 400);
  }

  try {
    const snapshots = await listStateSnapshots(parsed.data.limit);
    return apiOk({ snapshots });
  } catch (error) {
    return apiInternalError(error, "Failed to load snapshots.");
  }
}

export async function POST(request: Request) {
  const guard = await authorizeApiRequest({
    roles: ["admin", "management"],
    request,
    csrf: true,
    requireFacilityAccessForInmate: false,
  });
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => ({}));
  const parsed = snapshotBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid snapshot payload.", 400);
  }

  try {
    const snapshot = await createStateSnapshot({
      actor: guard.session.displayName,
      note: parsed.data.note,
      state: (await listDomainState()) as unknown as Record<string, unknown>,
    });

    await appendAuditEvent({
      action: "state-snapshot-created",
      actor: guard.session.displayName,
      result: "success",
      target: snapshot.id,
      details: snapshot.note ?? "Manual security snapshot",
    });

    return apiOk({
      snapshot: {
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        actor: snapshot.actor,
        note: snapshot.note,
        checksum: snapshot.checksum,
        keyId: snapshot.keyId,
      },
    });
  } catch (error) {
    return apiInternalError(error, "Failed to create snapshot.");
  }
}
