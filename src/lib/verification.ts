import type { VerificationAttempt } from "@/types/domain";

export function simulateVerificationAttempt(
  method: VerificationAttempt["method"],
  randomValue = Math.random(),
): VerificationAttempt {
  return {
    method,
    result: randomValue >= 0.2 ? "success" : "failed",
    timestamp: new Date().toISOString(),
    deviceId: "lab-terminal-01",
  };
}

export function appendVerificationLog(
  existing: VerificationAttempt[],
  attempt: VerificationAttempt,
  maxItems = 30,
): VerificationAttempt[] {
  return [attempt, ...existing].slice(0, maxItems);
}
