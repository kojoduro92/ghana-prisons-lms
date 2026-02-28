"use client";

import { STORAGE_KEYS, browserStorage } from "@/lib/storage";

export interface DeviceBiometricResponse {
  ok: boolean;
  message: string;
  credentialId?: string;
}

function randomBytes(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function randomBuffer(length = 32): ArrayBuffer {
  return randomBytes(length).buffer as ArrayBuffer;
}

function toBase64Url(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): ArrayBuffer | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer as ArrayBuffer;
  } catch {
    return null;
  }
}

function mapBiometricError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Biometric prompt was canceled or timed out.";
    }
    if (error.name === "InvalidStateError") {
      return "Biometric credential already exists on this device.";
    }
    if (error.name === "NotSupportedError") {
      return "Device biometric is not supported on this browser/device.";
    }
    return error.message || error.name;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown biometric error.";
}

export function isDeviceBiometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.PublicKeyCredential !== "undefined" && typeof navigator.credentials !== "undefined";
}

export function getStoredDeviceBiometricCredentialId(): string | null {
  return browserStorage.loadState<string>(STORAGE_KEYS.deviceBiometricCredentialId);
}

export function saveStoredDeviceBiometricCredentialId(credentialId: string): void {
  browserStorage.saveState(STORAGE_KEYS.deviceBiometricCredentialId, credentialId);
}

async function createBiometricCredential(displayName: string): Promise<DeviceBiometricResponse> {
  if (!isDeviceBiometricSupported()) {
    return {
      ok: false,
      message: "Device biometric is not available in this browser.",
    };
  }

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomBuffer(32),
    rp: {
      name: "Ghana Prisons Learning Portal",
    },
    user: {
      id: randomBuffer(16),
      name: `${displayName.toLowerCase().replace(/\s+/g, ".")}@local.gplp`,
      displayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },
      { alg: -257, type: "public-key" },
    ],
    timeout: 60_000,
    attestation: "none",
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
  };

  try {
    const created = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!created) {
      return {
        ok: false,
        message: "No biometric credential returned by device.",
      };
    }

    const credentialId = toBase64Url(created.rawId);
    saveStoredDeviceBiometricCredentialId(credentialId);

    return {
      ok: true,
      message: "Device biometric credential enrolled.",
      credentialId,
    };
  } catch (error) {
    return {
      ok: false,
      message: mapBiometricError(error),
    };
  }
}

async function verifyBiometricCredential(credentialId: string): Promise<DeviceBiometricResponse> {
  if (!isDeviceBiometricSupported()) {
    return {
      ok: false,
      message: "Device biometric is not available in this browser.",
    };
  }

  const decodedCredentialId = fromBase64Url(credentialId);
  if (!decodedCredentialId) {
    return {
      ok: false,
      message: "Stored biometric credential is invalid.",
    };
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomBuffer(32),
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: [
      {
        id: decodedCredentialId,
        type: "public-key",
      },
    ],
  };

  try {
    const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
    if (!assertion) {
      return {
        ok: false,
        message: "Biometric assertion was not returned.",
      };
    }

    return {
      ok: true,
      message: "Device biometric verification successful.",
      credentialId,
    };
  } catch (error) {
    return {
      ok: false,
      message: mapBiometricError(error),
    };
  }
}

export async function verifyOrEnrollDeviceBiometric(displayName: string): Promise<DeviceBiometricResponse> {
  const existingCredentialId = getStoredDeviceBiometricCredentialId();

  if (existingCredentialId) {
    const verification = await verifyBiometricCredential(existingCredentialId);
    if (verification.ok) {
      return verification;
    }
  }

  return createBiometricCredential(displayName);
}
