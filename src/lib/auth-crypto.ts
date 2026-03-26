import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { normalizeSessionPayload } from "@/lib/auth";
import type { UserSession } from "@/types/domain";

const SESSION_VERSION = "v1";

function sessionSecretKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? "gplp-local-dev-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

export function encryptSessionToken(session: UserSession): string {
  const iv = randomBytes(12);
  const key = sessionSecretKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(JSON.stringify(session), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${SESSION_VERSION}.${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSessionToken(token: string | undefined): UserSession | null {
  if (!token) return null;
  try {
    const [version, ivRaw, tagRaw, cipherRaw] = token.split(".");
    if (version !== SESSION_VERSION || !ivRaw || !tagRaw || !cipherRaw) {
      return null;
    }
    const key = sessionSecretKey();
    const iv = Buffer.from(ivRaw, "base64url");
    const authTag = Buffer.from(tagRaw, "base64url");
    const encrypted = Buffer.from(cipherRaw, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plain) as UserSession;
    return normalizeSessionPayload(parsed);
  } catch {
    return null;
  }
}
