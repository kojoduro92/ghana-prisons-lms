"use client";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  traceId?: string;
}

export async function fetchApi<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success || !payload.data) {
    const fallback = response.ok ? "Request failed." : `Request failed (${response.status}).`;
    throw new Error(payload?.error?.message ?? fallback);
  }

  return payload.data;
}
