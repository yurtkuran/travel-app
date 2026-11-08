import { requireAdminSession } from "@/features/auth/server/session";

import { ShellPage, type ShellPageProps } from "./shell-page";

export async function AdminShellPage(props: ShellPageProps) {
  await requireAdminSession();
  return <ShellPage {...props} />;
}
