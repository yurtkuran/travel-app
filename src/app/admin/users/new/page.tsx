import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function NewAdminUserPage() {
  return (
    <AdminShellPage
      description="Create a user account and generate a revocable, expiring, single-use setup link to email manually."
      emptyDescription="The provisioning form will call the existing account-setup service with recent-admin authorization."
      emptyTitle="Provisioning form ready"
      eyebrow="Invitation-only access"
      title="Provision a user"
    />
  );
}
