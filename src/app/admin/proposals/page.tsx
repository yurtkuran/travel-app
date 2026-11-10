import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listPendingProposals,
  type ProposalListItem,
} from "@/features/places/server/proposals";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ rejected?: string | string[] }>;
}) {
  const session = await requireAdminSession();
  const proposals = await listPendingProposals(session.actor);
  const query = await searchParams;
  return (
    <>
      <PageHeading
        description="Review proposed edits to published places without changing canonical content before approval."
        eyebrow="Moderation"
        title="Change proposals"
      />
      {query.rejected === "true" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            The proposal was rejected and the submitter can see the decision
            reason.
          </FeedbackBanner>
        </div>
      ) : null}
      {proposals.length ? (
        <DataTable<ProposalListItem & { submitterName: string | null }>
          caption="Pending change proposals"
          columns={[
            {
              header: "Place",
              key: "place",
              render: (proposal) => proposal.placeName,
            },
            {
              header: "Submitted by",
              key: "submitter",
              render: (proposal) => proposal.submitterName ?? "Deleted user",
            },
            {
              header: "Submitted",
              key: "submitted",
              render: (proposal) => formatDate(proposal.createdAt),
            },
            {
              align: "end",
              header: "Action",
              key: "action",
              render: (proposal) => (
                <Link
                  className="button-secondary"
                  href={`/admin/proposals/${proposal.id}`}
                >
                  Compare
                </Link>
              ),
            },
          ]}
          getRowKey={(proposal) => proposal.id}
          rows={proposals}
        />
      ) : (
        <EmptyState
          description="Field-level change proposals will appear here for comparison."
          eyebrow="Queue clear"
          title="No changes waiting"
        />
      )}
    </>
  );
}
