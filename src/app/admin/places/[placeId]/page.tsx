import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminSession } from "@/features/auth/server/session";
import { listPlaceMedia } from "@/features/media/server/media";
import { getManagedPlace } from "@/features/places/server/management";
import {
  listCategories,
  listCities,
} from "@/features/taxonomy/server/taxonomy";
import { publicationAction, updatePlaceAction } from "../actions";
import { PlaceForm } from "../place-form";
import { MediaManager } from "../media-manager";

export default async function EditAdminPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    publication?: string;
    media?: string;
  }>;
}) {
  const { placeId } = await params;
  const query = await searchParams;
  const session = await requireAdminSession();
  const [place, cities, categories, media] = await Promise.all([
    getManagedPlace(session.actor, placeId),
    listCities(session.actor, { pageSize: 100 }),
    listCategories(session.actor, { pageSize: 100 }),
    listPlaceMedia(placeId, "all"),
  ]);
  if (!place) notFound();
  return (
    <>
      <PageHeading
        action={
          <div className="moderation-actions">
            {place.status === "published" ? (
              <Link
                className="button-secondary"
                href={`/places/${place.id}/${place.slug}`}
              >
                View public page
              </Link>
            ) : null}
            <form action={publicationAction}>
              <input name="placeId" type="hidden" value={place.id} />
              <input
                name="intent"
                type="hidden"
                value={place.status === "published" ? "unpublish" : "publish"}
              />
              <button
                className={
                  place.status === "published"
                    ? "button-danger"
                    : "button-primary"
                }
                type="submit"
              >
                {place.status === "published" ? "Unpublish" : "Republish"}
              </button>
            </form>
          </div>
        }
        description="Edit canonical public information, manage publication state, and keep provenance separate from public attribution."
        eyebrow="Repository entry"
        title={place.name}
      />
      <p>
        <StatusBadge
          tone={place.status === "published" ? "positive" : "warning"}
        >
          {place.status}
        </StatusBadge>
      </p>
      {query.created ? (
        <FeedbackBanner>Place created and published.</FeedbackBanner>
      ) : null}
      {query.updated ? <FeedbackBanner>Place updated.</FeedbackBanner> : null}
      {query.publication ? (
        <FeedbackBanner>Place {query.publication}.</FeedbackBanner>
      ) : null}
      {query.media === "invalid" ? (
        <FeedbackBanner tone="error">
          Upload a valid JPEG, PNG, or WebP image no larger than 10 MB and
          provide alternative text or mark it decorative.
        </FeedbackBanner>
      ) : null}
      {query.media && query.media !== "invalid" ? (
        <FeedbackBanner>Image {query.media}.</FeedbackBanner>
      ) : null}
      <PlaceForm
        action={updatePlaceAction}
        categories={categories.items}
        cities={cities.items}
        place={place}
        submitLabel="Save changes"
      />
      <MediaManager items={media} placeId={place.id} />
    </>
  );
}
