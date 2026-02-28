import type { VerificationAttempt } from "@/types/domain";

interface VerificationOptions {
  forceResult?: VerificationAttempt["result"];
  deviceId?: string;
}

export function simulateVerificationAttempt(
  method: VerificationAttempt["method"],
  randomValue = Math.random(),
  options?: VerificationOptions,
): VerificationAttempt {
  const result = options?.forceResult ?? (randomValue >= 0.2 ? "success" : "failed");

  return {
    method,
    result,
    timestamp: new Date().toISOString(),
    deviceId: options?.deviceId ?? "lab-terminal-01",
  };
}

export function appendVerificationLog(
  existing: VerificationAttempt[],
  attempt: VerificationAttempt,
  maxItems = 30,
): VerificationAttempt[] {
  return [attempt, ...existing].slice(0, maxItems);
}
