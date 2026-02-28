import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, parseSerializedSession } from "@/lib/auth";
import type { Role, UserSession } from "@/types/domain";

export async function requireRoleSession(expectedRole: Role, nextPath: string): Promise<UserSession> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSerializedSession(cookieValue);

  if (!session) {
    redirect(`/admin-login?next=${encodeURIComponent(nextPath)}`);
  }

  if (session.role !== expectedRole) {
    redirect(`/admin-login?next=${encodeURIComponent(nextPath)}&reason=role`);
  }

  return session;
}
