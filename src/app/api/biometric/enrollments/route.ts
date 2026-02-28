import { NextResponse } from "next/server";
import { getEnrollment, upsertEnrollment } from "@/lib/biometric-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const record = await getEnrollment(studentId);
  if (!record) {
    return NextResponse.json({ error: "Enrollment record not found" }, { status: 404 });
  }

  return NextResponse.json({ record });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string;
      fullName?: string;
      prisonNumber?: string;
      faceCapturedAt?: string;
      fingerprintCapturedAt?: string;
      strictMode?: boolean;
      deviceBiometricSupported?: boolean;
      mode?: "strict" | "fallback";
      credentialId?: string;
    };

    if (
      !body.studentId ||
      !body.fullName ||
      !body.prisonNumber ||
      !body.faceCapturedAt ||
      !body.fingerprintCapturedAt ||
      !body.mode ||
      typeof body.strictMode !== "boolean" ||
      typeof body.deviceBiometricSupported !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid enrollment payload" }, { status: 400 });
    }

    const record = await upsertEnrollment({
      studentId: body.studentId,
      fullName: body.fullName,
      prisonNumber: body.prisonNumber,
      faceCapturedAt: body.faceCapturedAt,
      fingerprintCapturedAt: body.fingerprintCapturedAt,
      strictMode: body.strictMode,
      deviceBiometricSupported: body.deviceBiometricSupported,
      mode: body.mode,
      credentialId: body.credentialId,
    });

    return NextResponse.json({ record });
  } catch {
    return NextResponse.json({ error: "Unable to store enrollment record" }, { status: 500 });
  }
}
