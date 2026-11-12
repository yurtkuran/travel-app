import { AdminShell } from "@/components/shell/admin-shell";
import { requireAdminSession } from "@/features/auth/server/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  return <AdminShell session={session}>{children}</AdminShell>;
}
