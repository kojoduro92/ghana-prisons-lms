import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerificationTokenPayload {
  studentId: string;
  method: "fingerprint" | "face";
  deviceId: string;
  proof: "camera-face" | "device-biometric" | "simulated";
  verifiedAt: number;
  nonce: string;
}

function tokenSecret(): string {
  return process.env.VERIFICATION_TOKEN_SECRET ?? process.env.SESSION_SECRET ?? "dev-verification-secret";
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(input: string): string {
  return createHmac("sha256", tokenSecret()).update(input).digest("base64url");
}

export function createVerificationToken(payload: VerificationTokenPayload): string {
  const serialized = encodeBase64Url(JSON.stringify(payload));
  const sig = signature(serialized);
  return `${serialized}.${sig}`;
}

export function verifyVerificationToken(token: string): VerificationTokenPayload | null {
  const [serialized, sig] = token.split(".");
  if (!serialized || !sig) return null;
  const expected = signature(serialized);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(serialized)) as VerificationTokenPayload;
    if (
      !parsed?.studentId ||
      !parsed?.method ||
      !parsed?.deviceId ||
      !parsed?.proof ||
      typeof parsed?.verifiedAt !== "number" ||
      !parsed?.nonce
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
