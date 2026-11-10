import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireAdminSession } from "@/features/auth/server/session";
import { getProposalForModeration } from "@/features/places/server/proposals";

import { approveProposalAction } from "../actions";
import { RejectProposalDialog } from "../reject-dialog";

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

export default async function AdminProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ proposalId: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { proposalId } = await params;
  const session = await requireAdminSession();
  const proposal = await getProposalForModeration(session.actor, proposalId);
  if (!proposal || proposal.status !== "pending_review") notFound();
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
        action={
          <div className="moderation-actions">
            <RejectProposalDialog
              placeName={proposal.placeName}
              proposalId={proposal.id}
            />
            <form action={approveProposalAction}>
              <input name="proposalId" type="hidden" value={proposal.id} />
              <button
                className="button-primary"
                disabled={proposal.isStale}
                type="submit"
              >
                Approve changes
              </button>
            </form>
          </div>
        }
        description={`Submitted by ${proposal.submitterName ?? "a deleted user"}. Compare every changed public field before deciding.`}
        eyebrow="Moderation review"
        title={`Edit to ${proposal.placeName}`}
      />
      {proposal.isStale || query.error === "stale" ? (
        <div className="content-feedback">
          <FeedbackBanner title="Canonical place changed" tone="warning">
            This proposal was based on older public values. Approval is disabled
            to prevent overwriting newer edits; reject it with an explanation.
          </FeedbackBanner>
        </div>
      ) : null}
      {query.error && query.error !== "stale" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="error">
            {query.error === "reason"
              ? "Provide a rejection reason and try again."
              : "This proposal is no longer available for this decision."}
          </FeedbackBanner>
        </div>
      ) : null}
      <div className="proposal-comparison">
        <div className="proposal-comparison__heading">
          <strong>Field</strong>
          <strong>Current published value</strong>
          <strong>Proposed value</strong>
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
          <p className="eyebrow">Private submitter notes</p>
          <p>{proposal.submitterNotes}</p>
        </section>
      ) : null}
    </>
  );
}
