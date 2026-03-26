import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import {
  createStateSnapshot,
  getLatestStateSnapshot,
  listStateSnapshots,
} from "@/lib/state-snapshot-repository";

export const runtime = "nodejs";

async function authorizeAdminOrManagement(): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  return session.role === "admin" || session.role === "management";
}

export async function GET(request: Request) {
  if (!(await authorizeAdminOrManagement())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latestOnly = searchParams.get("latest") === "1";

  if (latestOnly) {
    const latest = await getLatestStateSnapshot();
    if (!latest) {
      return NextResponse.json({ error: "No snapshots available" }, { status: 404 });
    }
    return NextResponse.json({ snapshot: latest });
  }

  const snapshots = await listStateSnapshots(20);
  return NextResponse.json({ snapshots });
}

export async function POST(request: Request) {
  if (!(await authorizeAdminOrManagement())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      actor?: string;
      note?: string;
      state?: Record<string, unknown>;
    };

    if (!body.actor || !body.state || typeof body.state !== "object") {
      return NextResponse.json({ error: "Invalid snapshot payload" }, { status: 400 });
    }

    const snapshot = await createStateSnapshot({
      actor: body.actor,
      note: body.note,
      state: body.state,
    });

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
  } catch {
    return NextResponse.json({ error: "Unable to create state snapshot" }, { status: 500 });
  }
}
