import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { getStateSnapshot } from "@/lib/state-snapshot-repository";

export const runtime = "nodejs";

async function authorizeAdminOrManagement(): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  return session.role === "admin" || session.role === "management";
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ snapshotId: string }>;
  },
) {
  if (!(await authorizeAdminOrManagement())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { snapshotId } = await context.params;
  if (!snapshotId) {
    return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
  }

  const snapshot = await getStateSnapshot(snapshotId);
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json({
    snapshot: {
      id: snapshot.id,
      createdAt: snapshot.createdAt,
      actor: snapshot.actor,
      note: snapshot.note,
      checksum: snapshot.checksum,
      keyId: snapshot.keyId,
    },
  });
}
