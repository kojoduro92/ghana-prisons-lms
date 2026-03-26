import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-store";
import { prisma } from "@/lib/db/prisma";

export interface BiometricEnrollmentRecord {
  studentId: string;
  fullName: string;
  prisonNumber: string;
  faceCapturedAt: string;
  fingerprintCapturedAt: string;
  enrolledAt: string;
  strictMode: boolean;
  deviceBiometricSupported: boolean;
  mode: "strict" | "fallback";
  credentialIdHash?: string;
}

export interface BiometricVerificationRecord {
  id: string;
  studentId: string;
  method: "face" | "fingerprint";
  result: "success" | "failed";
  verifiedAt: string;
  deviceId: string;
  proof: "camera-face" | "device-biometric" | "simulated";
  strictMode: boolean;
}

interface BiometricStoreState {
  enrollments: Record<string, BiometricEnrollmentRecord>;
  verifications: BiometricVerificationRecord[];
}

const STORE_PATH = path.join(process.cwd(), "data", "biometric-records.json");
const STORE_BLOB_PATH = "system/biometric-records.json";

const EMPTY_STATE: BiometricStoreState = {
  enrollments: {},
  verifications: [],
};

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
    console.warn("[biometric-repository] Prisma unavailable, using file store:", error);
    return fallback();
  }
}

function toProofEnum(proof: BiometricVerificationRecord["proof"]) {
  if (proof === "camera-face") return "camera_face";
  if (proof === "device-biometric") return "device_biometric";
  return "simulated";
}

function fromProofEnum(proof: string): BiometricVerificationRecord["proof"] {
  if (proof === "camera_face") return "camera-face";
  if (proof === "device_biometric") return "device-biometric";
  return "simulated";
}

async function readStore(): Promise<BiometricStoreState> {
  if (hasBlobStore()) {
    try {
      const parsed = await readJsonBlob<Partial<BiometricStoreState>>(STORE_BLOB_PATH);
      if (parsed) {
        return {
          enrollments: parsed.enrollments ?? {},
          verifications: parsed.verifications ?? [],
        };
      }
    } catch (error) {
      console.warn("[biometric-repository] Blob read failed, falling back to local file:", error);
    }
  }

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<BiometricStoreState>;
    return {
      enrollments: parsed.enrollments ?? {},
      verifications: parsed.verifications ?? [],
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeStore(next: BiometricStoreState): Promise<void> {
  if (hasBlobStore()) {
    await writeJsonBlob(STORE_BLOB_PATH, next);
    return;
  }

  const directory = path.dirname(STORE_PATH);
  await mkdir(directory, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
}

function hashCredentialId(credentialId: string | undefined): string | undefined {
  if (!credentialId) return undefined;
  return createHash("sha256").update(credentialId).digest("hex");
}

export async function upsertEnrollment(input: {
  studentId: string;
  fullName: string;
  prisonNumber: string;
  faceCapturedAt: string;
  fingerprintCapturedAt: string;
  strictMode: boolean;
  deviceBiometricSupported: boolean;
  mode: "strict" | "fallback";
  credentialId?: string;
}): Promise<BiometricEnrollmentRecord> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({
        where: { studentId: input.studentId },
      });
      if (!inmate) {
        throw new Error(`Inmate profile not found for ${input.studentId}`);
      }

      const record = await prisma.biometricEnrollment.upsert({
        where: { inmateId: inmate.id },
        update: {
          faceCapturedAt: new Date(input.faceCapturedAt),
          fingerprintCapturedAt: new Date(input.fingerprintCapturedAt),
          strictMode: input.strictMode,
          deviceBiometricSupported: input.deviceBiometricSupported,
          mode: input.mode,
          credentialIdHash: hashCredentialId(input.credentialId) ?? null,
        },
        create: {
          inmateId: inmate.id,
          faceCapturedAt: new Date(input.faceCapturedAt),
          fingerprintCapturedAt: new Date(input.fingerprintCapturedAt),
          strictMode: input.strictMode,
          deviceBiometricSupported: input.deviceBiometricSupported,
          mode: input.mode,
          credentialIdHash: hashCredentialId(input.credentialId) ?? null,
        },
      });

      return {
        studentId: input.studentId,
        fullName: inmate.fullName,
        prisonNumber: inmate.prisonNumber,
        faceCapturedAt: record.faceCapturedAt.toISOString(),
        fingerprintCapturedAt: record.fingerprintCapturedAt.toISOString(),
        enrolledAt: record.createdAt.toISOString(),
        strictMode: record.strictMode,
        deviceBiometricSupported: record.deviceBiometricSupported,
        mode: record.mode as "strict" | "fallback",
        credentialIdHash: record.credentialIdHash ?? undefined,
      };
    },
    async () => {
      const current = await readStore();
      const nextRecord: BiometricEnrollmentRecord = {
        studentId: input.studentId,
        fullName: input.fullName,
        prisonNumber: input.prisonNumber,
        faceCapturedAt: input.faceCapturedAt,
        fingerprintCapturedAt: input.fingerprintCapturedAt,
        enrolledAt: new Date().toISOString(),
        strictMode: input.strictMode,
        deviceBiometricSupported: input.deviceBiometricSupported,
        mode: input.mode,
        credentialIdHash: hashCredentialId(input.credentialId),
      };

      current.enrollments[input.studentId] = nextRecord;
      await writeStore(current);
      return nextRecord;
    },
  );
}

export async function appendVerification(input: {
  studentId: string;
  method: "face" | "fingerprint";
  result: "success" | "failed";
  deviceId: string;
  proof: "camera-face" | "device-biometric" | "simulated";
  strictMode: boolean;
}): Promise<BiometricVerificationRecord> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({
        where: { studentId: input.studentId },
      });
      const created = await prisma.biometricVerification.create({
        data: {
          inmateId: inmate?.id ?? null,
          userId: inmate?.userId ?? null,
          method: input.method,
          result: input.result,
          deviceId: input.deviceId,
          proof: toProofEnum(input.proof),
          strictMode: input.strictMode,
        },
      });

      return {
        id: created.id,
        studentId: input.studentId,
        method: created.method as "face" | "fingerprint",
        result: created.result as "success" | "failed",
        verifiedAt: created.verifiedAt.toISOString(),
        deviceId: created.deviceId,
        proof: fromProofEnum(created.proof),
        strictMode: created.strictMode,
      };
    },
    async () => {
      const current = await readStore();
      const nextRecord: BiometricVerificationRecord = {
        id: randomUUID(),
        studentId: input.studentId,
        method: input.method,
        result: input.result,
        verifiedAt: new Date().toISOString(),
        deviceId: input.deviceId,
        proof: input.proof,
        strictMode: input.strictMode,
      };

      current.verifications = [nextRecord, ...current.verifications].slice(0, 500);
      await writeStore(current);
      return nextRecord;
    },
  );
}

export async function getLatestVerification(
  studentId: string,
  options?: {
    deviceId?: string;
    method?: "face" | "fingerprint";
    result?: "success" | "failed";
  },
): Promise<BiometricVerificationRecord | null> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({
        where: { studentId },
      });
      if (!inmate) return null;
      const record = await prisma.biometricVerification.findFirst({
        where: {
          inmateId: inmate.id,
          deviceId: options?.deviceId,
          method: options?.method,
          result: options?.result,
        },
        orderBy: { verifiedAt: "desc" },
      });
      if (!record) return null;
      return {
        id: record.id,
        studentId,
        method: record.method as "face" | "fingerprint",
        result: record.result as "success" | "failed",
        verifiedAt: record.verifiedAt.toISOString(),
        deviceId: record.deviceId,
        proof: fromProofEnum(record.proof),
        strictMode: record.strictMode,
      };
    },
    async () => {
      const current = await readStore();
      return (
        current.verifications.find((record) => {
          if (record.studentId !== studentId) return false;
          if (options?.deviceId && record.deviceId !== options.deviceId) return false;
          if (options?.method && record.method !== options.method) return false;
          if (options?.result && record.result !== options.result) return false;
          return true;
        }) ?? null
      );
    },
  );
}

export async function getEnrollment(studentId: string): Promise<BiometricEnrollmentRecord | null> {
  return withBackend(
    async () => {
      const record = await prisma.biometricEnrollment.findFirst({
        where: {
          inmate: {
            studentId,
          },
        },
        include: { inmate: true },
      });
      if (!record) return null;
      return {
        studentId,
        fullName: record.inmate.fullName,
        prisonNumber: record.inmate.prisonNumber,
        faceCapturedAt: record.faceCapturedAt.toISOString(),
        fingerprintCapturedAt: record.fingerprintCapturedAt.toISOString(),
        enrolledAt: record.createdAt.toISOString(),
        strictMode: record.strictMode,
        deviceBiometricSupported: record.deviceBiometricSupported,
        mode: record.mode as "strict" | "fallback",
        credentialIdHash: record.credentialIdHash ?? undefined,
      };
    },
    async () => {
      const current = await readStore();
      return current.enrollments[studentId] ?? null;
    },
  );
}

export async function listVerifications(limit = 50): Promise<BiometricVerificationRecord[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  return withBackend(
    async () => {
      const records = await prisma.biometricVerification.findMany({
        orderBy: { verifiedAt: "desc" },
        take: safeLimit,
        include: {
          inmate: {
            select: {
              studentId: true,
            },
          },
        },
      });
      return records.map((record) => ({
        id: record.id,
        studentId: record.inmate?.studentId ?? "UNKNOWN",
        method: record.method as "face" | "fingerprint",
        result: record.result as "success" | "failed",
        verifiedAt: record.verifiedAt.toISOString(),
        deviceId: record.deviceId,
        proof: fromProofEnum(record.proof),
        strictMode: record.strictMode,
      }));
    },
    async () => {
      const current = await readStore();
      return current.verifications.slice(0, safeLimit);
    },
  );
}
