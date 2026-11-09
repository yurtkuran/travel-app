import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listReviewsForModeration,
  type ReviewItem,
} from "@/features/reviews/server/reviews";
import { moderateReviewAction } from "./actions";

export default async function AdminReviewsPage() {
  const session = await requireAdminSession();
  const reviews = await listReviewsForModeration(session.actor);
  return (
    <>
      <PageHeading
        description="Hide or restore public reviews. Private visits never enter this workspace."
        eyebrow="Community moderation"
        title="Manage reviews"
      />
      {reviews.length ? (
        <DataTable<ReviewItem>
          caption="Reviews available for moderation"
          columns={[
            {
              header: "Review",
              key: "review",
              render: (review) => (
                <div className="table-primary-cell">
                  <strong>
                    {review.placeName} · {review.overallRating}/5
                  </strong>
                  <span>
                    {review.userName}
                    {review.text ? ` — ${review.text}` : ""}
                  </span>
                </div>
              ),
            },
            {
              header: "Status",
              key: "status",
              render: (review) => (
                <StatusBadge
                  tone={
                    review.moderationStatus === "visible"
                      ? "positive"
                      : "warning"
                  }
                >
                  {review.moderationStatus}
                </StatusBadge>
              ),
            },
            {
              align: "end",
              header: "Action",
              key: "action",
              render: (review) => (
                <div className="table-actions">
                  {review.moderationStatus !== "removed" ? (
                    <form action={moderateReviewAction}>
                      <input name="reviewId" type="hidden" value={review.id} />
                      <input
                        name="status"
                        type="hidden"
                        value={
                          review.moderationStatus === "visible"
                            ? "hidden"
                            : "visible"
                        }
                      />
                      <button className="button-secondary" type="submit">
                        {review.moderationStatus === "visible"
                          ? "Hide"
                          : "Restore"}
                      </button>
                    </form>
                  ) : null}
                  {review.moderationStatus !== "removed" ? (
                    <form action={moderateReviewAction}>
                      <input name="reviewId" type="hidden" value={review.id} />
                      <input name="status" type="hidden" value="removed" />
                      <button className="button-danger" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              ),
            },
          ]}
          getRowKey={(review) => review.id}
          rows={reviews}
        />
      ) : (
        <EmptyState
          description="Public reviews appear here as soon as users share them."
          title="No reviews to moderate"
        />
      )}
    </>
  );
}
