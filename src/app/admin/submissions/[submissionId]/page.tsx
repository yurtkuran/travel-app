import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireAdminSession } from "@/features/auth/server/session";
import { getSubmissionForModeration } from "@/features/places/server/moderation";

import { publishSubmissionAction } from "../actions";
import { RejectSubmissionDialog } from "../reject-dialog";

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

export default async function AdminSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { submissionId } = await params;
  const query = await searchParams;
  const session = await requireAdminSession();
  const submission = await getSubmissionForModeration(
    session.actor,
    submissionId,
  );
  if (!submission) notFound();

  return (
    <>
      <PageHeading
        action={
          <div className="moderation-actions">
            <RejectSubmissionDialog
              placeName={submission.name}
              submissionId={submission.id}
            />
            <form action={publishSubmissionAction}>
              <input name="submissionId" type="hidden" value={submission.id} />
              <button className="button-primary" type="submit">
                Approve and publish
              </button>
            </form>
          </div>
        }
        description={`Submitted by ${submission.submitterName ?? "a deleted user"}. Compare the public place values with the private recommendation context before deciding.`}
        eyebrow="Moderation review"
        title={submission.name}
      />
      {query.error ? (
        <div className="content-feedback">
          <FeedbackBanner tone="error">
            {query.error === "reason"
              ? "Provide a rejection reason and try again."
              : "This submission is no longer available for this decision."}
          </FeedbackBanner>
        </div>
      ) : null}
      <div className="detail-grid moderation-comparison">
        <section className="detail-panel">
          <p className="eyebrow">Proposed public record</p>
          <h2>Place details</h2>
          <dl>
            <Detail label="City" value={submission.cityName} />
            <Detail label="Category" value={submission.categoryName} />
            <Detail label="Type or cuisine" value={submission.typeLabel} />
            <Detail label="Short summary" value={submission.shortSummary} />
            <Detail label="Description" value={submission.description} />
            <Detail label="Street address" value={submission.streetAddress} />
            <Detail label="Address line 2" value={submission.addressLine2} />
            <Detail label="Postal code" value={submission.postalCode} />
            <Detail label="Phone number" value={submission.phone} />
          </dl>
        </section>
        <section className="detail-panel detail-panel--private">
          <p className="eyebrow">Private provenance</p>
          <h2>Recommendation source</h2>
          <p className="detail-panel__note">
            Visible only to the submitter and administrators. Never copied to
            the public record automatically.
          </p>
          <dl>
            <Detail label="Source type" value={submission.sourceType} />
            <Detail label="Source name" value={submission.sourceName} />
            <Detail label="Source URL" value={submission.sourceUrl} />
            <Detail label="Date recommended" value={submission.recommendedOn} />
            <Detail
              label="Submission notes"
              value={submission.submissionNotes}
            />
          </dl>
        </section>
      </div>
    </>
  );
}
