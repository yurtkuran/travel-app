import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getPublishedPlace } from "@/features/places/server/moderation";
import {
  getPublicRatingSummary,
  listPublicReviews,
} from "@/features/reviews/server/reviews";

function publicAddress(place: {
  addressLine2: string | null;
  cityLabel: string;
  postalCode: string | null;
  streetAddress: string | null;
}) {
  return [
    place.streetAddress,
    place.addressLine2,
    place.cityLabel,
    place.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ placeId: string; slug: string }>;
}) {
  const { placeId, slug } = await params;
  const place = await getPublishedPlace(placeId);
  if (!place) notFound();
  if (slug !== place.slug) redirect(`/places/${place.id}/${place.slug}`);
  const address = publicAddress(place);
  const [reviews, ratingSummary] = await Promise.all([
    listPublicReviews(place.id),
    getPublicRatingSummary(place.id),
  ]);

  return (
    <div className="page-container public-place">
      <header className="public-place__header">
        <div>
          <p className="eyebrow">
            {place.categoryName} · {place.cityLabel}
          </p>
          <h1>{place.name}</h1>
          {place.shortSummary ? (
            <p className="public-place__summary">{place.shortSummary}</p>
          ) : null}
        </div>
        <div className="public-place__actions">
          <Link
            className="button-secondary"
            href={`/places/${place.id}/${place.slug}/visits`}
          >
            Record a visit
          </Link>
          <Link
            className="button-primary"
            href={`/places/${place.id}/${place.slug}/review`}
          >
            Write a review
          </Link>
        </div>
      </header>
      <div className="public-place__body">
        <article>
          <p className="eyebrow">About this place</p>
          <h2>{place.typeLabel ?? place.categoryName}</h2>
          <p>
            {place.description ??
              "More editorial detail will be added as this place develops in the archive."}
          </p>
        </article>
        <aside>
          <p className="eyebrow">Details</p>
          <dl>
            <div>
              <dt>Location</dt>
              <dd>{address || place.cityLabel}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{place.categoryName}</dd>
            </div>
            {place.phone ? (
              <div>
                <dt>Phone</dt>
                <dd>{place.phone}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
      <section className="public-reviews">
        <p className="eyebrow">
          Public reviews · {ratingSummary.overall.count}
        </p>
        <h2>
          {ratingSummary.overall.average === null
            ? "Not yet rated"
            : `${ratingSummary.overall.average} out of 5`}
        </h2>
        {ratingSummary.dimensions.length ? (
          <p>
            {ratingSummary.dimensions
              .map(
                (dimension) =>
                  `${dimension.name} ${dimension.average}/5 (${dimension.count})`,
              )
              .join(" · ")}
          </p>
        ) : null}
        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <strong>
                  {review.overallRating} / 5 · {review.userName}
                </strong>
                {review.text ? <p>{review.text}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p>No public reviews yet.</p>
        )}
      </section>
    </div>
  );
}
