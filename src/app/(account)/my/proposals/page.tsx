import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import {
  listOwnProposals,
  type ProposalListItem,
} from "@/features/places/server/proposals";
import { SubmissionStatus } from "@/features/places/submission-status";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function ProposalsPage() {
  const session = await requireCurrentSession("/my/proposals");
  const proposals = await listOwnProposals(session.actor);
  return (
    <>
      <PageHeading
        description="Track the edits you have suggested to published places and the administrator's decision on each proposal."
        eyebrow="Contribution workspace"
        title="Your proposed edits"
      />
      {proposals.length ? (
        <DataTable<ProposalListItem>
          caption="Your proposed place edits"
          columns={[
            {
              header: "Place",
              key: "place",
              render: (proposal) => proposal.placeName,
            },
            {
              header: "Submitted",
              key: "submitted",
              render: (proposal) => formatDate(proposal.createdAt),
            },
            {
              header: "Status",
              key: "status",
              render: (proposal) => (
                <SubmissionStatus status={proposal.status} />
              ),
            },
            {
              align: "end",
              header: "Action",
              key: "action",
              render: (proposal) => (
                <Link
                  className="button-secondary"
                  href={`/my/proposals/${proposal.id}`}
                >
                  View
                </Link>
              ),
            },
          ]}
          getRowKey={(proposal) => proposal.id}
          rows={proposals}
        />
      ) : (
        <EmptyState
          description="Suggested edits will appear here after you propose a change from a published place."
          title="No proposed edits"
        />
      )}
    </>
  );
}
