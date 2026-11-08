import { PublicShell } from "@/components/shell/public-shell";
import { getCurrentSession } from "@/features/auth/server/session";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  return <PublicShell session={session}>{children}</PublicShell>;
}
