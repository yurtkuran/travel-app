import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <AdminShellPage
      description="Suspend, restore, delete, promote, or demote an account without exposing that person's private visits."
      emptyDescription={`Account ${userId} will load here when management queries are connected.`}
      emptyTitle="Account unavailable"
      eyebrow="Access management"
      title="Manage account"
    />
  );
}
