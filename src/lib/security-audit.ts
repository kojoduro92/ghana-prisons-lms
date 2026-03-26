import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-store";
import { prisma } from "@/lib/db/prisma";

export interface SecurityAuditRecord {
  id: string;
  action: string;
  actor: string;
  result: "success" | "failed";
  target?: string;
  details?: string;
  timestamp: string;
}

const AUDIT_FILE = path.join(process.cwd(), "data", "audit-events.json");
const AUDIT_BLOB_PATH = "system/audit-events.json";

function hasMysqlDatasource(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("mysql://");
}

async function withBackend<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (!hasMysqlDatasource()) {
    return fallback();
  }
  try {
    return await primary();
  } catch (error) {
    console.warn("[security-audit] Prisma unavailable, using file store:", error);
    return fallback();
  }
}

async function readAuditFile(): Promise<SecurityAuditRecord[]> {
  if (hasBlobStore()) {
    try {
      const parsed = await readJsonBlob<SecurityAuditRecord[]>(AUDIT_BLOB_PATH);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn("[security-audit] Blob read failed, falling back to local file:", error);
    }
  }

  try {
    const raw = await readFile(AUDIT_FILE, "utf8");
    const parsed = JSON.parse(raw) as SecurityAuditRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAuditFile(events: SecurityAuditRecord[]): Promise<void> {
  if (hasBlobStore()) {
    await writeJsonBlob(AUDIT_BLOB_PATH, events.slice(0, 2000));
    return;
  }

  await mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  await writeFile(AUDIT_FILE, JSON.stringify(events.slice(0, 2000), null, 2), "utf8");
}

export async function listAuditEvents(): Promise<SecurityAuditRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        actor: row.actorName,
        result: row.result as "success" | "failed",
        target: row.target ?? undefined,
        details: row.details ?? undefined,
        timestamp: row.createdAt.toISOString(),
      }));
    },
    async () => readAuditFile(),
  );
}

export async function appendAuditEvent(input: Omit<SecurityAuditRecord, "id" | "timestamp">): Promise<SecurityAuditRecord> {
  return withBackend(
    async () => {
      const actorUser = await prisma.user.findFirst({
        where: {
          OR: [{ username: input.actor }, { id: input.actor }],
        },
      });
      const created = await prisma.auditEvent.create({
        data: {
          action: input.action,
          actorId: actorUser?.id ?? null,
          actorName: input.actor,
          result: input.result,
          target: input.target ?? null,
          details: input.details ?? null,
        },
      });
      return {
        id: created.id,
        action: created.action,
        actor: created.actorName,
        result: created.result as "success" | "failed",
        target: created.target ?? undefined,
        details: created.details ?? undefined,
        timestamp: created.createdAt.toISOString(),
      };
    },
    async () => {
      const current = await readAuditFile();
      const record: SecurityAuditRecord = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        ...input,
      };
      await writeAuditFile([record, ...current]);
      return record;
    },
  );
}
