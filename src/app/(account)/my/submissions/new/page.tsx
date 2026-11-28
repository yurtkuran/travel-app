import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import { listSubmissionTaxonomy } from "@/features/places/server/submissions";

import { SubmissionForm } from "./submission-form";

export default async function NewSubmissionPage() {
  const session = await requireCurrentSession("/my/submissions/new");
  const taxonomy = await listSubmissionTaxonomy(session.actor);

  return (
    <>
      <PageHeading title="Add a place" />
      <SubmissionForm
        categories={taxonomy.categories}
        cities={taxonomy.cities}
      />
    </>
  );
}
