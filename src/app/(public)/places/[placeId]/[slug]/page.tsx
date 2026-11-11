import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getPublishedPlace } from "@/features/places/server/moderation";
import { listPlaceMedia, mediaUrl } from "@/features/media/server/media";
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

function metadataDescription(place: {
  categoryName: string;
  cityLabel: string;
  description: string | null;
  shortSummary: string | null;
}) {
  const description =
    place.shortSummary ??
    place.description ??
    `Discover this ${place.categoryName.toLowerCase()} in ${place.cityLabel}.`;
  return description.length > 160
    ? `${description.slice(0, 157).trimEnd()}...`
    : description;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeId: string; slug: string }>;
}): Promise<Metadata> {
  const { placeId } = await params;
  const place = await getPublishedPlace(placeId);
  if (!place) return {};
  const description = metadataDescription(place);
  return {
    title: place.name,
    description,
    openGraph: {
      title: place.name,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: place.name,
      description,
    },
  };
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
  const mapUrl =
    place.mapListing ??
    (place.latitude && place.longitude
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(place.latitude)}&mlon=${encodeURIComponent(place.longitude)}#map=16/${encodeURIComponent(place.latitude)}/${encodeURIComponent(place.longitude)}`
      : null);
  const phoneUrl = place.phone
    ? `tel:${place.phone.replace(/[^+\d,;#*]/g, "")}`
    : null;
  const [reviews, ratingSummary, media] = await Promise.all([
    listPublicReviews(place.id),
    getPublicRatingSummary(place.id),
    listPlaceMedia(place.id),
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
            href={`/places/${place.id}/${place.slug}/suggest-edit`}
          >
            Suggest an edit
          </Link>
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
      {media.length ? (
        <section aria-label="Place gallery" className="place-gallery">
          {media.map((item, index) => (
            <figure
              className={index === 0 ? "place-gallery__cover" : undefined}
              key={item.id}
            >
              <Image
                alt={item.altText ?? ""}
                height={item.height}
                priority={index === 0}
                sizes="(max-width: 1100px) 100vw, 90rem"
                src={mediaUrl(item.storageKey)}
                width={item.width}
              />
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>
          ))}
        </section>
      ) : null}
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
                <dd>
                  <a href={phoneUrl ?? undefined}>{place.phone}</a>
                </dd>
              </div>
            ) : null}
            {place.officialWebsite ? (
              <div>
                <dt>Website</dt>
                <dd>
                  <a
                    href={place.officialWebsite}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Visit official website
                  </a>
                </dd>
              </div>
            ) : null}
            {mapUrl ? (
              <div>
                <dt>Map</dt>
                <dd>
                  <a href={mapUrl} rel="noreferrer" target="_blank">
                    View on map
                  </a>
                </dd>
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
