export function validateSameOrigin(request: Request): string | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) {
    return null;
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return "CSRF origin mismatch.";
    }
  } catch {
    return "Invalid request origin.";
  }

  return null;
}
