import { redirect } from "next/navigation";
import { loginPathForRole, roleHomePath } from "@/lib/auth";
import { getServerSession } from "@/lib/server-session";
import type { Role, UserSession } from "@/types/domain";

export async function requireRoleSession(expectedRole: Role, nextPath: string): Promise<UserSession> {
  const session = await getServerSession();
  const loginPath = loginPathForRole(expectedRole);

  if (!session) {
    redirect(`${loginPath}?next=${encodeURIComponent(nextPath)}`);
  }

  if (session.role !== expectedRole) {
    const fallback = roleHomePath(session.role);
    redirect(`${loginPath}?next=${encodeURIComponent(nextPath)}&reason=role&fallback=${encodeURIComponent(fallback)}`);
  }

  return session;
}
