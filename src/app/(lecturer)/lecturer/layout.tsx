import { requireRoleSession } from "@/lib/server-auth";

export default async function LecturerPortalLayout({ children }: { children: React.ReactNode }) {
  await requireRoleSession("lecturer", "/lecturer/dashboard");
  return children;
}
