import { NextResponse } from "next/server";
import {
  createRestoreApproval,
  getRequiredRestorePhrase,
  verifyRestoreApproval,
} from "@/lib/restore-approval";
import { getServerSession } from "@/lib/server-session";
import { getStateSnapshot } from "@/lib/state-snapshot-repository";

export const runtime = "nodejs";

async function authorizeAdminOrManagement() {
  const session = await getServerSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "management") return null;
  return session;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ snapshotId: string }>;
  },
) {
  const session = await authorizeAdminOrManagement();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { snapshotId } = await context.params;
  if (!snapshotId) {
    return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as
      | {
          stage: "request";
          actor?: string;
        }
      | {
          stage: "confirm";
          approvalToken?: string;
          challenge?: string;
          confirmationPhrase?: string;
        };

    if (body.stage === "request") {
      const snapshot = await getStateSnapshot(snapshotId);
      if (!snapshot) {
        return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
      }

      const approval = await createRestoreApproval({
        snapshotId,
        actor: body.actor?.trim() || session.displayName,
      });

      return NextResponse.json({
        approvalToken: approval.approvalToken,
        challenge: approval.challenge,
        expiresAt: approval.expiresAt,
        requiredPhrase: getRequiredRestorePhrase(),
      });
    }

    if (body.stage === "confirm") {
      if (!body.approvalToken || !body.challenge || !body.confirmationPhrase) {
        return NextResponse.json({ error: "Missing restore approval fields" }, { status: 400 });
      }

      const approval = await verifyRestoreApproval({
        snapshotId,
        approvalToken: body.approvalToken,
        challenge: body.challenge,
        confirmationPhrase: body.confirmationPhrase,
      });
      if (!approval.ok) {
        return NextResponse.json({ error: approval.error ?? "Restore approval failed" }, { status: 403 });
      }

      const snapshot = await getStateSnapshot(snapshotId);
      if (!snapshot) {
        return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
      }

      return NextResponse.json({
        snapshot,
        approvedBy: approval.actor,
        approvedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Unsupported stage" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Restore approval request failed" }, { status: 500 });
  }
}
