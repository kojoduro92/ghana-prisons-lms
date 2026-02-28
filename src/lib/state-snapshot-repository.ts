import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getOrCreateLocalKey, keyFingerprintHex } from "@/lib/local-keyring";

export interface StateSnapshotRecord {
  id: string;
  createdAt: string;
  actor: string;
  note?: string;
  checksum: string;
  state: Record<string, unknown>;
  keyId?: string;
}

export interface StateSnapshotMeta {
  id: string;
  createdAt: string;
  actor: string;
  note?: string;
  checksum: string;
  keyId?: string;
}

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "state-snapshots");
const MAX_SNAPSHOT_FILES = 120;

interface EncryptedStatePayload {
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

interface StoredSnapshotRecord {
  id: string;
  createdAt: string;
  actor: string;
  note?: string;
  checksum: string;
  keyId?: string;
  encryptedState?: EncryptedStatePayload;
  state?: Record<string, unknown>;
}

async function ensureSnapshotDir(): Promise<void> {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

function toSnapshotMeta(record: StateSnapshotRecord): StateSnapshotMeta {
  return {
    id: record.id,
    createdAt: record.createdAt,
    actor: record.actor,
    note: record.note,
    checksum: record.checksum,
    keyId: record.keyId,
  };
}

function snapshotFilePath(id: string): string {
  return path.join(SNAPSHOT_DIR, `${id}.json`);
}

async function getSnapshotEncryptionKey(): Promise<Buffer> {
  return getOrCreateLocalKey({
    envName: "GPLP_SNAPSHOT_ENCRYPTION_KEY",
    fileName: "snapshot-encryption.key",
    expectedBytes: 32,
  });
}

function encryptStatePayload(state: Record<string, unknown>, key: Buffer): EncryptedStatePayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(state), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptStatePayload(payload: EncryptedStatePayload, key: Buffer): Record<string, unknown> {
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Decrypted snapshot state is invalid.");
  }
  return parsed as Record<string, unknown>;
}

async function pruneSnapshotFiles(maxFiles = MAX_SNAPSHOT_FILES): Promise<void> {
  await ensureSnapshotDir();
  const files = await fs.readdir(SNAPSHOT_DIR);
  const records: Array<{ filePath: string; createdAt: string }> = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(SNAPSHOT_DIR, file);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoredSnapshotRecord>;
      if (!parsed.createdAt) continue;
      records.push({ filePath, createdAt: parsed.createdAt });
    } catch {
      continue;
    }
  }

  const sorted = records.sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1));
  const stale = sorted.slice(Math.max(1, maxFiles));

  for (const item of stale) {
    await fs.rm(item.filePath, { force: true });
  }
}

export async function createStateSnapshot(input: {
  actor: string;
  note?: string;
  state: Record<string, unknown>;
}): Promise<StateSnapshotRecord> {
  await ensureSnapshotDir();
  const encryptionKey = await getSnapshotEncryptionKey();
  const keyId = keyFingerprintHex(encryptionKey);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const checksum = crypto.createHash("sha256").update(JSON.stringify(input.state)).digest("hex");
  const storedRecord: StoredSnapshotRecord = {
    id,
    createdAt,
    actor: input.actor,
    note: input.note?.trim() || undefined,
    checksum,
    keyId,
    encryptedState: encryptStatePayload(input.state, encryptionKey),
  };

  await fs.writeFile(snapshotFilePath(id), JSON.stringify(storedRecord, null, 2), "utf8");
  await pruneSnapshotFiles();

  return {
    id,
    createdAt,
    actor: input.actor,
    note: input.note?.trim() || undefined,
    checksum,
    state: input.state,
    keyId,
  };
}

export async function listStateSnapshots(limit = 20): Promise<StateSnapshotMeta[]> {
  await ensureSnapshotDir();
  const files = await fs.readdir(SNAPSHOT_DIR);
  const records: StateSnapshotMeta[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    try {
      const raw = await fs.readFile(path.join(SNAPSHOT_DIR, file), "utf8");
      const parsed = JSON.parse(raw) as Partial<StoredSnapshotRecord>;
      if (!parsed.id || !parsed.createdAt || !parsed.actor || !parsed.checksum) continue;
      records.push(
        toSnapshotMeta({
          id: parsed.id,
          createdAt: parsed.createdAt,
          actor: parsed.actor,
          checksum: parsed.checksum,
          note: parsed.note,
          keyId: parsed.keyId,
          state: {},
        }),
      );
    } catch {
      continue;
    }
  }

  return records
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
    .slice(0, Math.max(1, limit));
}

export async function getStateSnapshot(id: string): Promise<StateSnapshotRecord | null> {
  await ensureSnapshotDir();

  try {
    const raw = await fs.readFile(snapshotFilePath(id), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredSnapshotRecord>;

    if (!parsed.id || !parsed.createdAt || !parsed.actor || !parsed.checksum) {
      return null;
    }

    let state: Record<string, unknown>;
    if (parsed.encryptedState) {
      const encryptionKey = await getSnapshotEncryptionKey();
      state = decryptStatePayload(parsed.encryptedState, encryptionKey);
    } else if (parsed.state && typeof parsed.state === "object") {
      // Backward compatibility with older plaintext snapshot files.
      state = parsed.state;
    } else {
      return null;
    }

    return {
      id: parsed.id,
      createdAt: parsed.createdAt,
      actor: parsed.actor,
      note: parsed.note,
      checksum: parsed.checksum,
      keyId: parsed.keyId,
      state,
    };
  } catch {
    return null;
  }
}

export async function getLatestStateSnapshot(): Promise<StateSnapshotRecord | null> {
  const snapshots = await listStateSnapshots(1);
  const latest = snapshots[0];
  if (!latest) return null;
  return getStateSnapshot(latest.id);
}
