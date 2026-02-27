import { describe, expect, it } from "vitest";
import { appendVerificationLog, simulateVerificationAttempt } from "@/lib/verification";

describe("verification flow", () => {
  it("returns failed result when random value is below threshold", () => {
    const attempt = simulateVerificationAttempt("fingerprint", 0.1);
    expect(attempt.result).toBe("failed");
  });

  it("returns success result when random value is above threshold", () => {
    const attempt = simulateVerificationAttempt("face", 0.9);
    expect(attempt.result).toBe("success");
  });

  it("keeps most recent logs first and capped", () => {
    const first = simulateVerificationAttempt("face", 0.9);
    const second = simulateVerificationAttempt("fingerprint", 0.9);
    const logs = appendVerificationLog([first], second, 1);

    expect(logs.length).toBe(1);
    expect(logs[0].method).toBe("fingerprint");
  });
});
