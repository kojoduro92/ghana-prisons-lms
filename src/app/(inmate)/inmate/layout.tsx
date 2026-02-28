import { requireRoleSession } from "@/lib/server-auth";

export default async function InmatePortalLayout({ children }: { children: React.ReactNode }) {
  await requireRoleSession("inmate", "/inmate/dashboard");
  return children;
}
