import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FormConfirmationDialog } from "@/components/ui/form-confirmation-dialog";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import { getVisitPlace, listOwnVisits } from "@/features/visits/server/visits";

import {
  createVisitAction,
  deleteVisitAction,
  updateVisitAction,
} from "./actions";

const stars = (value: number) => `${"★".repeat(value)}${"☆".repeat(5 - value)}`;

export default async function PlaceVisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string; slug: string }>;
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    updated?: string;
  }>;
}) {
  const { placeId, slug } = await params;
  const query = await searchParams;
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/visits`,
  );
  const place = await getVisitPlace(placeId);
  if (!place) notFound();
  if (place.slug !== slug) redirect(`/places/${place.id}/${place.slug}/visits`);
  const visits = await listOwnVisits(session.actor, place.id);

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
        description={`Private snapshots for ${place.name}. These ratings and notes never affect public reviews.`}
        eyebrow="Your private visits"
        title={place.name}
      />
      {query.created ? <FeedbackBanner>Visit recorded.</FeedbackBanner> : null}
      {query.deleted ? <FeedbackBanner>Visit deleted.</FeedbackBanner> : null}
      {query.updated ? <FeedbackBanner>Visit updated.</FeedbackBanner> : null}
      <div className="visit-layout">
        <section className="detail-panel">
          <p className="eyebrow">Log a visit</p>
          <h2>Add a private snapshot</h2>
          <form action={createVisitAction} className="stacked-form">
            <input name="placeId" type="hidden" value={place.id} />
            <input name="slug" type="hidden" value={place.slug} />
            <label>
              Visit date
              <input
                max={new Date().toISOString().slice(0, 10)}
                name="visitedOn"
                required
                type="date"
              />
            </label>
            <label>
              Overall rating
              <select name="overallRating" required defaultValue="">
                <option disabled value="">
                  Select 1–5 stars
                </option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} star{rating === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            {place.dimensions.map((dimension) => (
              <label key={dimension.id}>
                {dimension.name} rating (optional)
                <select name={`rating:${dimension.id}`} defaultValue="">
                  <option value="">Not rated</option>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Private notes (optional)
              <textarea maxLength={5000} name="notes" rows={5} />
            </label>
            <button className="button-primary" type="submit">
              Record visit
            </button>
          </form>
        </section>
        <section>
          <p className="eyebrow">History · {visits.length}</p>
          <h2>Your visits to this place</h2>
          {visits.length ? (
            <div className="visit-history">
              {visits.map((visit) => (
                <article className="visit-card" key={visit.id}>
                  <div>
                    <strong>{visit.visitedOn}</strong>
                    <span
                      aria-label={`${visit.overallRating} of 5 stars`}
                      className="rating-stars"
                    >
                      {stars(visit.overallRating)}
                    </span>
                  </div>
                  {visit.dimensions.length ? (
                    <p>
                      {visit.dimensions
                        .map(
                          (dimension) =>
                            `${dimension.name}: ${dimension.rating}/5`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                  {visit.notes ? <p>{visit.notes}</p> : null}
                  <details className="visit-edit">
                    <summary>Edit visit</summary>
                    <form action={updateVisitAction} className="stacked-form">
                      <input name="visitId" type="hidden" value={visit.id} />
                      <input name="placeId" type="hidden" value={place.id} />
                      <input name="slug" type="hidden" value={place.slug} />
                      <label>
                        Visit date
                        <input
                          name="visitedOn"
                          required
                          type="date"
                          defaultValue={visit.visitedOn}
                        />
                      </label>
                      <label>
                        Overall rating
                        <select
                          name="overallRating"
                          defaultValue={visit.overallRating}
                        >
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating}
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
                              visit.dimensions.find(
                                ({ id }) => id === dimension.id,
                              )?.rating ?? ""
                            }
                          >
                            <option value="">Not rated</option>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                      <label>
                        Private notes (optional)
                        <textarea
                          maxLength={5000}
                          name="notes"
                          rows={4}
                          defaultValue={visit.notes ?? ""}
                        />
                      </label>
                      <button className="button-primary" type="submit">
                        Save changes
                      </button>
                    </form>
                  </details>
                  <FormConfirmationDialog
                    action={deleteVisitAction}
                    confirmLabel="Delete visit"
                    description="This permanently removes the visit date, private notes, and private ratings from your history."
                    fields={{
                      placeId: place.id,
                      slug: place.slug,
                      visitId: visit.id,
                    }}
                    title="Delete this private visit?"
                    triggerLabel="Delete visit"
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Record your first visit to begin a private history for this place."
              title="No visits to this place"
            />
          )}
        </section>
      </div>
    </>
  );
}
