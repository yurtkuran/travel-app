import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listPendingSubmissions,
  type ModerationListItem,
} from "@/features/places/server/moderation";

function queryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    rejected?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const session = await requireAdminSession();
  const parameters = await searchParams;
  const sort = queryValue(parameters.sort) ?? "oldest";
  const result = await listPendingSubmissions(session.actor, {
    page: queryValue(parameters.page) ?? "1",
    pageSize: 20,
    sort: sort as "name" | "oldest" | "recent",
  });

  return (
    <>
      <PageHeading
        description="Review user-submitted places, inspect private provenance, and make an explicit publication decision."
        eyebrow="Moderation"
        title="Place submissions"
      />
      {parameters.rejected === "true" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            The submission was rejected and the submitter can now see the
            decision reason.
          </FeedbackBanner>
        </div>
      ) : null}
      <div className="management-list__heading management-list__heading--queue">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>Waiting for a decision</h2>
        </div>
        <form className="list-toolbar">
          <div className="form-field">
            <label htmlFor="submission-sort">Sort</label>
            <select defaultValue={sort} id="submission-sort" name="sort">
              <option value="oldest">Oldest first</option>
              <option value="recent">Newest first</option>
              <option value="name">Place name</option>
            </select>
          </div>
          <button className="button-secondary" type="submit">
            Apply
          </button>
        </form>
      </div>
      {result.items.length ? (
        <>
          <DataTable<ModerationListItem>
            caption="Pending place submissions"
            columns={[
              {
                header: "Place",
                key: "place",
                render: (submission) => (
                  <div className="table-primary-cell">
                    <strong>{submission.name}</strong>
                    <span>
                      {submission.cityName} · {submission.categoryName}
                    </span>
                  </div>
                ),
              },
              {
                header: "Submitted by",
                key: "submitter",
                render: (submission) =>
                  submission.submitterName ?? "Deleted user",
              },
              {
                header: "Private source",
                key: "source",
                render: (submission) => submission.sourceName ?? "Not provided",
              },
              {
                header: "Submitted",
                key: "submitted",
                render: (submission) => formatDate(submission.submittedAt),
              },
              {
                align: "end",
                header: "Action",
                key: "action",
                render: (submission) => (
                  <Link
                    className="button-secondary"
                    href={`/admin/submissions/${submission.id}`}
                  >
                    Review
                  </Link>
                ),
              },
            ]}
            getRowKey={(submission) => submission.id}
            rows={result.items}
          />
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            pathname="/admin/submissions"
            query={{ sort }}
            total={result.total}
          />
        </>
      ) : (
        <EmptyState
          description="New user submissions will appear here without becoming visible on public routes."
          eyebrow="Queue clear"
          title="No submissions waiting"
        />
      )}
    </>
  );
}
