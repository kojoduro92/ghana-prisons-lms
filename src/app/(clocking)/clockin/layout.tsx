import { requireRoleSession } from "@/lib/server-auth";

export default async function ClockingOfficerLayout({ children }: { children: React.ReactNode }) {
  await requireRoleSession("clocking_officer", "/clockin/checkin");
  return children;
}
