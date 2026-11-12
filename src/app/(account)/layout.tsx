import { PersonalShell } from "@/components/shell/personal-shell";
import { requireCurrentSession } from "@/features/auth/server/session";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCurrentSession("/my");
  return <PersonalShell session={session}>{children}</PersonalShell>;
}
