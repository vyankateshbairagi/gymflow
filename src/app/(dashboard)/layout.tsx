import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Secure check: confirms the user still exists and is active, not just
  // that the session cookie is well-formed (that part is handled by
  // src/proxy.ts on every request, before this layout even runs).
  const user = await getCurrentUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
