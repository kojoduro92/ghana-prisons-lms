import { NextResponse } from "next/server";
import { appendVerification } from "@/lib/biometric-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string;
      method?: "face" | "fingerprint";
      result?: "success" | "failed";
      deviceId?: string;
      proof?: "camera-face" | "device-biometric" | "simulated";
      strictMode?: boolean;
    };

    if (
      !body.studentId ||
      !body.method ||
      !body.result ||
      !body.deviceId ||
      !body.proof ||
      typeof body.strictMode !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
    }

    const record = await appendVerification({
      studentId: body.studentId,
      method: body.method,
      result: body.result,
      deviceId: body.deviceId,
      proof: body.proof,
      strictMode: body.strictMode,
    });

    return NextResponse.json({ record });
  } catch {
    return NextResponse.json({ error: "Unable to store verification record" }, { status: 500 });
  }
}
