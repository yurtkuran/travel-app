import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import { getOwnProposal } from "@/features/places/server/proposals";
import { SubmissionStatus } from "@/features/places/submission-status";

import { withdrawProposalAction } from "../actions";

const fields = [
  ["Name", "name"],
  ["City", "city"],
  ["Category", "category"],
  ["Type or cuisine", "typeLabel"],
  ["Short summary", "shortSummary"],
  ["Description", "description"],
  ["Street address", "streetAddress"],
  ["Address line 2", "addressLine2"],
  ["Postal code", "postalCode"],
  ["Phone number", "phone"],
] as const;

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ proposalId: string }>;
  searchParams: Promise<{
    created?: string | string[];
    error?: string | string[];
    withdrawn?: string | string[];
  }>;
}) {
  const { proposalId } = await params;
  const session = await requireCurrentSession(`/my/proposals/${proposalId}`);
  const proposal = await getOwnProposal(session.actor, proposalId);
  if (!proposal) notFound();
  const query = await searchParams;
  const values = (side: "current" | "proposed", key: string) => {
    if (key === "city")
      return side === "current"
        ? proposal.current.cityName
        : proposal.proposedCityName;
    if (key === "category")
      return side === "current"
        ? proposal.current.categoryName
        : proposal.proposedCategoryName;
    const source = side === "current" ? proposal.current : proposal.proposed;
    return String(source[key as keyof typeof source] ?? "Not provided");
  };
  return (
    <>
      <PageHeading
        action={<SubmissionStatus status={proposal.status} />}
        description="Review your proposed values, the canonical place values, and the current moderation decision."
        eyebrow="Proposed edit"
        title={proposal.placeName}
      />
      {query.created === "true" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            Your proposed edit was submitted for administrative review.
          </FeedbackBanner>
        </div>
      ) : null}
      {query.withdrawn === "true" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            The proposal was withdrawn. The published place was not changed.
          </FeedbackBanner>
        </div>
      ) : null}
      {query.error ? (
        <div className="content-feedback">
          <FeedbackBanner tone="error">
            This proposal is no longer available for that action.
          </FeedbackBanner>
        </div>
      ) : null}
      {proposal.decisionReason ? (
        <div className="content-feedback">
          <FeedbackBanner title="Administrator decision" tone="error">
            {proposal.decisionReason}
          </FeedbackBanner>
        </div>
      ) : null}
      {proposal.isStale && proposal.status === "pending_review" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="warning">
            The published place changed after this proposal was submitted. An
            administrator must review the newer canonical values before acting.
          </FeedbackBanner>
        </div>
      ) : null}
      <div className="proposal-comparison">
        <div className="proposal-comparison__heading">
          <strong>Field</strong>
          <strong>Published value</strong>
          <strong>Your proposed value</strong>
        </div>
        {fields.map(([label, key]) => (
          <div className="proposal-comparison__row" key={key}>
            <strong>{label}</strong>
            <span>{values("current", key)}</span>
            <span>{values("proposed", key)}</span>
          </div>
        ))}
      </div>
      {proposal.submitterNotes ? (
        <section className="detail-panel proposal-notes">
          <p className="eyebrow">Private submission notes</p>
          <p>{proposal.submitterNotes}</p>
        </section>
      ) : null}
      {proposal.status === "pending_review" ? (
        <form action={withdrawProposalAction} className="proposal-actions">
          <input name="proposalId" type="hidden" value={proposal.id} />
          <button className="button-danger" type="submit">
            Withdraw proposal
          </button>
        </form>
      ) : null}
    </>
  );
}
