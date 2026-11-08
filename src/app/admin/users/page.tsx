import Link from "next/link";

import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminUsersPage() {
  return (
    <AdminShellPage
      action={
        <Link className="button-primary" href="/admin/users/new">
          Provision user
        </Link>
      }
      description="Provision invitation-only accounts, suspend access, and manage roles with final-administrator safeguards."
      emptyDescription="Provision the first invited user and copy their single-use setup link."
      emptyTitle="No invited users"
      eyebrow="Access management"
      title="Manage users"
    />
  );
}
