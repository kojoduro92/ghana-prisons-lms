import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

interface LocalKeyOptions {
  envName: string;
  fileName: string;
  expectedBytes?: number;
}

const keyCache = new Map<string, Buffer>();
const KEY_DIR = path.join(process.cwd(), "data", "keys");

function decodeKeyMaterial(raw: string, expectedBytes: number): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const decoded = Buffer.from(trimmed, "hex");
    if (decoded.length === expectedBytes) return decoded;
  }

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === expectedBytes) return decoded;
  } catch {
    return null;
  }

  return null;
}

export async function getOrCreateLocalKey(options: LocalKeyOptions): Promise<Buffer> {
  const expectedBytes = options.expectedBytes ?? 32;
  const cacheKey = `${options.envName}:${options.fileName}:${expectedBytes}`;
  const cached = keyCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const envRaw = process.env[options.envName];
  if (envRaw) {
    const decoded = decodeKeyMaterial(envRaw, expectedBytes);
    if (!decoded) {
      throw new Error(`${options.envName} is not a valid ${expectedBytes}-byte hex/base64 key.`);
    }
    keyCache.set(cacheKey, decoded);
    return decoded;
  }

  await fs.mkdir(KEY_DIR, { recursive: true });
  const filePath = path.join(KEY_DIR, options.fileName);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const decoded = decodeKeyMaterial(raw, expectedBytes);
    if (!decoded) {
      throw new Error(`Stored key ${filePath} is invalid.`);
    }
    keyCache.set(cacheKey, decoded);
    return decoded;
  } catch {
    const generated = crypto.randomBytes(expectedBytes);
    await fs.writeFile(filePath, generated.toString("hex"), { encoding: "utf8", mode: 0o600 });
    keyCache.set(cacheKey, generated);
    return generated;
  }
}

export function keyFingerprintHex(key: Buffer, length = 16): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, length);
}
