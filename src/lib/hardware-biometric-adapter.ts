"use client";

import {
  isDeviceBiometricSupported,
  verifyOrEnrollDeviceBiometric,
  type DeviceBiometricResponse,
} from "@/lib/device-biometric";

export interface HardwareBiometricChallengeResult extends DeviceBiometricResponse {
  adapterId: string;
  adapterLabel: string;
}

export interface HardwareBiometricAdapter {
  id: string;
  label: string;
  isSupported: () => boolean;
  verifyOrEnroll: (displayName: string) => Promise<DeviceBiometricResponse>;
}

const defaultAdapters: HardwareBiometricAdapter[] = [
  {
    id: "webauthn-device",
    label: "WebAuthn Device Biometric",
    isSupported: () => isDeviceBiometricSupported(),
    verifyOrEnroll: (displayName: string) => verifyOrEnrollDeviceBiometric(displayName),
  },
];

const runtimeAdapters: HardwareBiometricAdapter[] = [...defaultAdapters];

export function registerHardwareBiometricAdapter(adapter: HardwareBiometricAdapter): void {
  const existingIndex = runtimeAdapters.findIndex((entry) => entry.id === adapter.id);
  if (existingIndex >= 0) {
    runtimeAdapters.splice(existingIndex, 1, adapter);
    return;
  }
  runtimeAdapters.push(adapter);
}

export function getHardwareBiometricAdapters(): HardwareBiometricAdapter[] {
  return [...runtimeAdapters];
}

export function resolveHardwareBiometricAdapter(preferredId?: string): HardwareBiometricAdapter {
  if (preferredId) {
    const preferred = runtimeAdapters.find((entry) => entry.id === preferredId);
    if (preferred) return preferred;
  }

  const supported = runtimeAdapters.find((entry) => entry.isSupported());
  if (supported) return supported;
  return runtimeAdapters[0];
}

export async function runHardwareBiometricChallenge(input: {
  displayName: string;
  preferredAdapterId?: string;
}): Promise<HardwareBiometricChallengeResult> {
  const adapter = resolveHardwareBiometricAdapter(input.preferredAdapterId);
  const result = await adapter.verifyOrEnroll(input.displayName);
  return {
    ...result,
    adapterId: adapter.id,
    adapterLabel: adapter.label,
  };
}
