import { notFound, redirect } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import { getPlaceForProposal } from "@/features/places/server/proposals";
import { listSubmissionTaxonomy } from "@/features/places/server/submissions";

import { ProposalForm } from "./proposal-form";

export default async function SuggestEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string; slug: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { placeId, slug } = await params;
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/suggest-edit`,
  );
  const [place, taxonomy] = await Promise.all([
    getPlaceForProposal(session.actor, placeId),
    listSubmissionTaxonomy(session.actor),
  ]);
  if (!place) notFound();
  if (slug !== place.slug) {
    redirect(`/places/${place.id}/${place.slug}/suggest-edit`);
  }
  const query = await searchParams;
  return (
    <>
      <PageHeading
        description="Suggest a change to published information while preserving the canonical place until an administrator approves it."
        eyebrow="Published place"
        title={`Suggest an edit to ${place.name}`}
      />
      {query.error ? (
        <div className="content-feedback">
          <FeedbackBanner tone="error">
            The proposal could not be submitted. Change at least one field,
            review the values, and try again.
          </FeedbackBanner>
        </div>
      ) : null}
      <ProposalForm
        categories={taxonomy.categories}
        cities={taxonomy.cities}
        place={place}
      />
    </>
  );
}
