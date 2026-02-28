import { requireRoleSession } from "@/lib/server-auth";

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  await requireRoleSession("admin", "/admin/dashboard");
  return children;
}
