import Image from "next/image";
import Link from "next/link";

import { mediaUrl } from "@/features/media/server/media";
import type { PublicPlaceCard as Place } from "@/features/places/server/browse";

export function PublicPlaceCard({ place }: { place: Place }) {
  return (
    <article className="place-card">
      <Link href={`/places/${place.id}/${place.slug}`}>
        {place.coverStorageKey && place.coverWidth && place.coverHeight ? (
          <Image
            alt={place.coverAltText ?? ""}
            className="place-card__image"
            height={place.coverHeight}
            sizes="(max-width: 1100px) 50vw, 30vw"
            src={mediaUrl(place.coverStorageKey)}
            width={place.coverWidth}
          />
        ) : (
          <div className="place-card__image place-card__image--empty">
            <span>No image</span>
          </div>
        )}
        <div className="place-card__body">
          <p className="eyebrow">
            {place.categoryName} · {place.cityName}
          </p>
          <h2>{place.name}</h2>
          {place.typeLabel ? <p>{place.typeLabel}</p> : null}
          {place.shortSummary ? <p>{place.shortSummary}</p> : null}
          <div className="place-card__meta">
            <span>
              {place.ratingAverage === null
                ? "Not yet rated"
                : `${place.ratingAverage}/5 · ${place.reviewCount} ${place.reviewCount === 1 ? "review" : "reviews"}`}
            </span>
            {place.visitCount ? (
              <span>Your visits · {place.visitCount}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
