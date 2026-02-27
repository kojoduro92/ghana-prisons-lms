import { TopNav } from "@/components/top-nav";

interface RoleShellProps {
  title: string;
  subtitle?: string;
  userName?: string;
  children: React.ReactNode;
}

export function RoleShell({ title, subtitle, userName, children }: RoleShellProps) {
  return (
    <div className="portal-root">
      <TopNav title={title} subtitle={subtitle} userName={userName} />
      <main className="portal-content">{children}</main>
    </div>
  );
}
