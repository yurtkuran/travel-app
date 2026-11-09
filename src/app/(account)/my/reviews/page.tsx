import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCurrentSession } from "@/features/auth/server/session";
import {
  listOwnReviews,
  type ReviewItem,
} from "@/features/reviews/server/reviews";

export default async function ReviewsPage() {
  const session = await requireCurrentSession("/my/reviews");
  const reviews = await listOwnReviews(session.actor);
  return (
    <>
      <PageHeading
        description="Manage your current public assessments and see any moderation state."
        eyebrow="Public contributions"
        title="Your reviews"
      />
      {reviews.length ? (
        <DataTable<ReviewItem>
          caption="Your public reviews"
          columns={[
            {
              header: "Place",
              key: "place",
              render: (review) => <strong>{review.placeName}</strong>,
            },
            {
              header: "Rating",
              key: "rating",
              render: (review) => `${review.overallRating} / 5`,
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
                <Link
                  className="button-secondary"
                  href={`/places/${review.placeId}/${review.placeSlug}/review`}
                >
                  Edit
                </Link>
              ),
            },
          ]}
          getRowKey={(review) => review.id}
          rows={reviews}
        />
      ) : (
        <EmptyState
          description="Reviews you publish from a place will appear here."
          title="No reviews shared"
        />
      )}
    </>
  );
}
