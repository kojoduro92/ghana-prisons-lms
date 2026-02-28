import { describe, expect, it } from "vitest";
import { resolveStrictBiometricMode } from "@/lib/biometric-policy";

describe("biometric policy", () => {
  it("enables strict mode when explicit true-like value is provided", () => {
    expect(resolveStrictBiometricMode("true", "development")).toBe(true);
    expect(resolveStrictBiometricMode("1", "development")).toBe(true);
  });

  it("disables strict mode when explicit false-like value is provided", () => {
    expect(resolveStrictBiometricMode("false", "production")).toBe(false);
    expect(resolveStrictBiometricMode("0", "production")).toBe(false);
  });

  it("defaults to strict mode in production when flag is undefined", () => {
    expect(resolveStrictBiometricMode(undefined, "production")).toBe(true);
  });

  it("defaults to non-strict mode in non-production when flag is undefined", () => {
    expect(resolveStrictBiometricMode(undefined, "development")).toBe(false);
    expect(resolveStrictBiometricMode(undefined, "test")).toBe(false);
  });
});
