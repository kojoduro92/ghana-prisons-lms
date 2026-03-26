import { NextResponse } from "next/server";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
  traceId: string;
}

function createTraceId(): string {
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<ApiEnvelope<T>> {
  const traceId = createTraceId();
  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      traceId,
    },
    init,
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiEnvelope<null>> {
  const traceId = createTraceId();
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      traceId,
    },
    { status },
  );
}

