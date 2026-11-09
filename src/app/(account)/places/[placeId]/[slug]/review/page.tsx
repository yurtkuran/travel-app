import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import {
  getOwnReview,
  getReviewPlace,
} from "@/features/reviews/server/reviews";
import { deleteReviewAction, saveReviewAction } from "./actions";

export default async function ReviewPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string; slug: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const { placeId, slug } = await params;
  const query = await searchParams;
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/review`,
  );
  const place = await getReviewPlace(placeId);
  if (!place) notFound();
  if (place.slug !== slug) redirect(`/places/${place.id}/${place.slug}/review`);
  const review = await getOwnReview(session.actor, place.id);
  return (
    <>
      <PageHeading
        action={
          <Link
            className="button-secondary"
            href={`/places/${place.id}/${place.slug}`}
          >
            Back to place
          </Link>
        }
        description="Your single current public assessment. Visit snapshots remain private and separate."
        eyebrow="Public review"
        title={place.name}
      />
      {query.saved ? <FeedbackBanner>Review published.</FeedbackBanner> : null}
      {query.deleted ? <FeedbackBanner>Review deleted.</FeedbackBanner> : null}
      <section className="detail-panel review-editor">
        <form action={saveReviewAction} className="stacked-form">
          <input name="placeId" type="hidden" value={place.id} />
          <input name="slug" type="hidden" value={place.slug} />
          <label>
            Overall rating
            <select
              name="overallRating"
              required
              defaultValue={review?.overallRating ?? ""}
            >
              <option disabled value="">
                Select 1–5 stars
              </option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          {place.dimensions.map((dimension) => (
            <label key={dimension.id}>
              {dimension.name} rating (optional)
              <select
                name={`rating:${dimension.id}`}
                defaultValue={
                  review?.dimensions.find(({ id }) => id === dimension.id)
                    ?.rating ?? ""
                }
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Review text (optional)
            <textarea
              maxLength={5000}
              name="text"
              rows={8}
              defaultValue={review?.text ?? ""}
            />
          </label>
          <button className="button-primary" type="submit">
            {review ? "Update review" : "Publish review"}
          </button>
        </form>
        {review ? (
          <form action={deleteReviewAction}>
            <input name="reviewId" type="hidden" value={review.id} />
            <input name="placeId" type="hidden" value={place.id} />
            <input name="slug" type="hidden" value={place.slug} />
            <button className="button-danger" type="submit">
              Delete review
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
