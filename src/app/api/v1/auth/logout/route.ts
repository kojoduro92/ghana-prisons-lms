import { apiError, apiOk } from "@/lib/api/response";
import { validateSameOrigin } from "@/lib/security/csrf";
import { clearServerSessionCookies } from "@/lib/server-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = validateSameOrigin(request);
  if (csrfError) {
    return apiError("CSRF_INVALID", csrfError, 403);
  }

  await clearServerSessionCookies();
  return apiOk({ cleared: true });
}
