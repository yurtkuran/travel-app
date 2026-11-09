import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import {
  listOwnSubmissions,
  type SubmissionListItem,
} from "@/features/places/server/submissions";
import { SubmissionStatus } from "@/features/places/submission-status";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function SubmissionsPage() {
  const session = await requireCurrentSession("/my/submissions");
  const submissions = await listOwnSubmissions(session.actor);

  return (
    <>
      <PageHeading
        action={
          <Link className="button-primary" href="/my/submissions/new">
            Add a place
          </Link>
        }
        description="Draft new places, submit them for review, and follow each contribution through the publication workflow."
        eyebrow="Contribution workspace"
        title="Your submissions"
      />
      {submissions.length ? (
        <DataTable<SubmissionListItem>
          caption="Your place submissions"
          columns={[
            {
              header: "Place",
              key: "place",
              render: (submission) => (
                <div className="table-primary-cell">
                  <strong>{submission.name ?? "Untitled draft"}</strong>
                  <span>
                    {[submission.cityName, submission.categoryName]
                      .filter(Boolean)
                      .join(" · ") || "Classification not yet complete"}
                  </span>
                </div>
              ),
            },
            {
              header: "Updated",
              key: "updated",
              render: (submission) => formatDate(submission.updatedAt),
            },
            {
              header: "Status",
              key: "status",
              render: (submission) => (
                <SubmissionStatus status={submission.status} />
              ),
            },
            {
              align: "end",
              header: "Action",
              key: "action",
              render: (submission) => (
                <Link
                  className="button-secondary"
                  href={`/my/submissions/${submission.id}`}
                >
                  View
                </Link>
              ),
            },
          ]}
          getRowKey={(submission) => submission.id}
          rows={submissions}
        />
      ) : (
        <EmptyState
          description="Create a private draft to recommend a place for the public archive."
          eyebrow="Your archive begins here"
          title="No place submissions"
        />
      )}
    </>
  );
}
