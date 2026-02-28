import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

const EMPTY_STATE: BiometricStoreState = {
  enrollments: {},
  verifications: [],
};

async function readStore(): Promise<BiometricStoreState> {
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
}

export async function appendVerification(input: {
  studentId: string;
  method: "face" | "fingerprint";
  result: "success" | "failed";
  deviceId: string;
  proof: "camera-face" | "device-biometric" | "simulated";
  strictMode: boolean;
}): Promise<BiometricVerificationRecord> {
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
}

export async function getEnrollment(studentId: string): Promise<BiometricEnrollmentRecord | null> {
  const current = await readStore();
  return current.enrollments[studentId] ?? null;
}
