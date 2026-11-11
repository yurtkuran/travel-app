import Link from "next/link";
import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import {
  getOwnSubmission,
  listSubmissionTaxonomy,
} from "@/features/places/server/submissions";
import { SubmissionStatus } from "@/features/places/submission-status";

import { SubmissionForm } from "../new/submission-form";

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

export default async function SubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{
    created?: string | string[];
    edit?: string | string[];
    updated?: string | string[];
  }>;
}) {
  const { submissionId } = await params;
  const query = await searchParams;
  const session = await requireCurrentSession(
    `/my/submissions/${submissionId}`,
  );
  const submission = await getOwnSubmission(session.actor, submissionId);
  if (!submission) notFound();
  const created = typeof query.created === "string" ? query.created : undefined;
  const updated = typeof query.updated === "string" ? query.updated : undefined;
  const editing = query.edit === "true" && submission.status === "draft";
  const taxonomy = editing ? await listSubmissionTaxonomy(session.actor) : null;

  return (
    <>
      <PageHeading
        action={
          submission.status === "draft" ? (
            <div className="moderation-actions">
              <SubmissionStatus status={submission.status} />
              <Link
                className="button-secondary"
                href={
                  editing
                    ? `/my/submissions/${submission.id}`
                    : `/my/submissions/${submission.id}?edit=true`
                }
              >
                {editing ? "Cancel editing" : "Edit draft"}
              </Link>
            </div>
          ) : (
            <SubmissionStatus status={submission.status} />
          )
        }
        description="Review the public place information and the private recommendation provenance attached to this contribution."
        eyebrow="Contribution workspace"
        title={submission.name ?? "Untitled draft"}
      />
      {created || updated ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            {created === "submitted" || updated === "submitted"
              ? "Your place was submitted for administrative review."
              : updated === "draft"
                ? "Your private draft changes were saved."
                : "Your private draft was saved."}
          </FeedbackBanner>
        </div>
      ) : null}
      {submission.moderationReason ? (
        <div className="content-feedback">
          <FeedbackBanner title="Administrator decision" tone="error">
            {submission.moderationReason}
          </FeedbackBanner>
        </div>
      ) : null}
      {editing && taxonomy ? (
        <SubmissionForm
          categories={taxonomy.categories}
          cities={taxonomy.cities}
          submission={submission}
        />
      ) : (
        <div className="detail-grid">
          <section className="detail-panel">
            <p className="eyebrow">Public place information</p>
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
              Visible only to you and administrators.
            </p>
            <dl>
              <Detail label="Source type" value={submission.sourceType} />
              <Detail label="Source name" value={submission.sourceName} />
              <Detail label="Source URL" value={submission.sourceUrl} />
              <Detail
                label="Date recommended"
                value={submission.recommendedOn}
              />
              <Detail
                label="Submission notes"
                value={submission.submissionNotes}
              />
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
