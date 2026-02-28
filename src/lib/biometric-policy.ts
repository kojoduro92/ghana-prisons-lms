export function resolveStrictBiometricMode(
  value: string | undefined,
  nodeEnv: string | undefined,
): boolean {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return nodeEnv === "production";
}

export function isStrictBiometricMode(): boolean {
  return resolveStrictBiometricMode(process.env.NEXT_PUBLIC_STRICT_BIOMETRIC, process.env.NODE_ENV);
}
