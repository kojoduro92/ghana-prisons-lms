import crypto from "node:crypto";
import { getOrCreateLocalKey } from "@/lib/local-keyring";

const APPROVAL_TOKEN_TTL_MS = 5 * 60 * 1000;
const REQUIRED_RESTORE_PHRASE = "RESTORE NOW";

interface RestoreApprovalPayload {
  snapshotId: string;
  actor: string;
  challenge: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

async function getRestoreSigningKey(): Promise<Buffer> {
  return getOrCreateLocalKey({
    envName: "GPLP_RESTORE_SIGNING_KEY",
    fileName: "restore-signing.key",
    expectedBytes: 32,
  });
}

async function signApprovalPayload(encodedPayload: string): Promise<string> {
  const key = await getRestoreSigningKey();
  const signature = crypto.createHmac("sha256", key).update(encodedPayload).digest();
  return toBase64Url(signature);
}

function timingSafeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function createRestoreApproval(input: {
  snapshotId: string;
  actor: string;
}): Promise<{ approvalToken: string; challenge: string; expiresAt: string }> {
  const now = Date.now();
  const challenge = crypto.randomInt(100000, 999999).toString();
  const payload: RestoreApprovalPayload = {
    snapshotId: input.snapshotId,
    actor: input.actor,
    challenge,
    nonce: crypto.randomUUID(),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + APPROVAL_TOKEN_TTL_MS).toISOString(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await signApprovalPayload(encodedPayload);
  const approvalToken = `${encodedPayload}.${signature}`;
  return {
    approvalToken,
    challenge,
    expiresAt: payload.expiresAt,
  };
}

export async function verifyRestoreApproval(input: {
  snapshotId: string;
  approvalToken: string;
  challenge: string;
  confirmationPhrase: string;
}): Promise<{ ok: boolean; actor?: string; error?: string }> {
  if (input.confirmationPhrase.trim().toUpperCase() !== REQUIRED_RESTORE_PHRASE) {
    return { ok: false, error: `Confirmation phrase must be '${REQUIRED_RESTORE_PHRASE}'.` };
  }

  const [encodedPayload, providedSignature] = input.approvalToken.split(".");
  if (!encodedPayload || !providedSignature) {
    return { ok: false, error: "Approval token format is invalid." };
  }

  const expectedSignature = await signApprovalPayload(encodedPayload);
  if (!timingSafeEquals(expectedSignature, providedSignature)) {
    return { ok: false, error: "Approval token signature is invalid." };
  }

  let payload: RestoreApprovalPayload;
  try {
    const decoded = fromBase64Url(encodedPayload).toString("utf8");
    payload = JSON.parse(decoded) as RestoreApprovalPayload;
  } catch {
    return { ok: false, error: "Approval token payload is invalid." };
  }

  if (payload.snapshotId !== input.snapshotId) {
    return { ok: false, error: "Approval token does not match snapshot." };
  }
  if (payload.challenge !== input.challenge.trim()) {
    return { ok: false, error: "Approval challenge code mismatch." };
  }

  const expiresMs = new Date(payload.expiresAt).getTime();
  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {
    return { ok: false, error: "Approval token expired." };
  }

  return {
    ok: true,
    actor: payload.actor,
  };
}

export function getRequiredRestorePhrase(): string {
  return REQUIRED_RESTORE_PHRASE;
}
