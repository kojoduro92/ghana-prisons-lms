import type { NextResponse } from "next/server";
import { hasValidFacilityAccess } from "@/lib/auth";
import { apiError, type ApiEnvelope } from "@/lib/api/response";
import { validateSameOrigin } from "@/lib/security/csrf";
import { getServerSession } from "@/lib/server-session";
import type { Role, UserSession } from "@/types/domain";

interface GuardSuccess {
  session: UserSession;
}

interface GuardFailure {
  response: NextResponse<ApiEnvelope<null>>;
}

type GuardResult = GuardSuccess | GuardFailure;

export interface ApiGuardOptions {
  roles: Role[];
  request?: Request;
  csrf?: boolean;
  requireFacilityAccessForInmate?: boolean;
}

function hasSessionRole(sessionRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(sessionRole);
}

export async function authorizeApiRequest(options: ApiGuardOptions): Promise<GuardResult> {
  const session = await getServerSession();
  if (!session) {
    return {
      response: apiError("AUTH_UNAUTHORIZED", "Session not found or expired.", 401),
    };
  }

  if (!hasSessionRole(session.role, options.roles)) {
    return {
      response: apiError("AUTH_FORBIDDEN", "You do not have access to this resource.", 403),
    };
  }

  const requireFacilityAccess = options.requireFacilityAccessForInmate ?? true;
  if (requireFacilityAccess && session.role === "inmate" && !hasValidFacilityAccess(session)) {
    return {
      response: apiError("FACILITY_ACCESS_REQUIRED", "Inmate facility access grant is required.", 403),
    };
  }

  if (options.csrf && options.request) {
    const csrfError = validateSameOrigin(options.request);
    if (csrfError) {
      return {
        response: apiError("CSRF_INVALID", csrfError, 403),
      };
    }
  }

  return { session };
}

export function apiInternalError(error: unknown, message = "Unexpected server error.") {
  console.error("[api-error]", error);
  return apiError("INTERNAL_ERROR", message, 500);
}
