import { PageHeading } from "@/components/ui/page-heading";
import { requireAdminSession } from "@/features/auth/server/session";

import { ProvisionForm } from "./provision-form";

export default async function NewAdminUserPage() {
  await requireAdminSession();
  return (
    <>
      <PageHeading
        description="Create a user account and generate a revocable, expiring, single-use setup link to email manually."
        eyebrow="Invitation-only access"
        title="Provision a user"
      />
      <ProvisionForm />
    </>
  );
}
