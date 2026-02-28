import { requireRoleSession } from "@/lib/server-auth";

export default async function ManagementPortalLayout({ children }: { children: React.ReactNode }) {
  await requireRoleSession("management", "/management/dashboard");
  return children;
}
