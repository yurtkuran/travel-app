"use client";

import { useActionState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { initialSubmissionActionState } from "@/features/places/submission-action-state";
import type { OwnedSubmissionDetail } from "@/features/places/server/submissions";

import { createSubmissionAction, updateSubmissionAction } from "./actions";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="field-error" id={id}>
      {message}
    </p>
  ) : null;
}

function describedBy(helpId: string, errorId: string, error?: string) {
  return `${helpId}${error ? ` ${errorId}` : ""}`;
}

export function SubmissionForm({
  categories,
  cities,
  submission,
}: {
  categories: { id: string; label: string }[];
  cities: { id: string; label: string }[];
  submission?: OwnedSubmissionDetail;
}) {
  const [state, action, pending] = useActionState(
    submission ? updateSubmissionAction : createSubmissionAction,
    initialSubmissionActionState,
  );

  return (
    <form action={action} className="submission-form">
      {submission ? (
        <input name="submissionId" type="hidden" value={submission.id} />
      ) : null}
      {state.message ? (
        <FeedbackBanner tone="error">{state.message}</FeedbackBanner>
      ) : null}

      <fieldset className="form-section">
        <legend>
          <span className="eyebrow">01 · Identity</span>
          <strong>Place information</strong>
        </legend>
        <p className="form-section__description">
          Name, city, and category are required when you submit, but not when
          saving a private draft.
        </p>
        <div className="form-grid form-grid--two">
          <div className="form-field form-grid__wide">
            <label htmlFor="submission-name">Place name</label>
            <input
              aria-describedby={
                state.fieldErrors.name ? "submission-name-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.name)}
              id="submission-name"
              maxLength={160}
              name="name"
              defaultValue={submission?.name ?? ""}
            />
            <FieldError
              id="submission-name-error"
              message={state.fieldErrors.name}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-city">City</label>
            <select
              aria-describedby={
                state.fieldErrors.cityId ? "submission-city-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.cityId)}
              id="submission-city"
              name="cityId"
              defaultValue={submission?.cityId ?? ""}
            >
              <option value="">Select a city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.label}
                </option>
              ))}
            </select>
            <FieldError
              id="submission-city-error"
              message={state.fieldErrors.cityId}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-category">Category</label>
            <select
              aria-describedby={
                state.fieldErrors.categoryId
                  ? "submission-category-error"
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.categoryId)}
              id="submission-category"
              name="categoryId"
              defaultValue={submission?.categoryId ?? ""}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <FieldError
              id="submission-category-error"
              message={state.fieldErrors.categoryId}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-type">Type or cuisine</label>
            <input
              id="submission-type"
              maxLength={120}
              name="typeLabel"
              placeholder="Italian, cocktail bar, independent bookstore…"
              defaultValue={submission?.typeLabel ?? ""}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-phone">Phone number</label>
            <input
              autoComplete="tel"
              id="submission-phone"
              maxLength={50}
              name="phone"
              type="tel"
              defaultValue={submission?.phone ?? ""}
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="submission-summary">Short summary</label>
            <textarea
              id="submission-summary"
              maxLength={500}
              name="shortSummary"
              rows={2}
              defaultValue={submission?.shortSummary ?? ""}
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="submission-description">Description</label>
            <textarea
              id="submission-description"
              maxLength={5000}
              name="description"
              rows={5}
              defaultValue={submission?.description ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <span className="eyebrow">02 · Location</span>
          <strong>Address</strong>
        </legend>
        <p className="form-section__description">
          Add as much location detail as is useful. The selected city supplies
          the region and country context.
        </p>
        <div className="form-grid form-grid--two">
          <div className="form-field form-grid__wide">
            <label htmlFor="submission-street">Street address</label>
            <input
              autoComplete="street-address"
              id="submission-street"
              maxLength={200}
              name="streetAddress"
              defaultValue={submission?.streetAddress ?? ""}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-address-two">Address line 2</label>
            <input
              id="submission-address-two"
              maxLength={120}
              name="addressLine2"
              defaultValue={submission?.addressLine2 ?? ""}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-postal">Postal code</label>
            <input
              autoComplete="postal-code"
              id="submission-postal"
              maxLength={32}
              name="postalCode"
              defaultValue={submission?.postalCode ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="form-section form-section--private">
        <legend>
          <span className="eyebrow">03 · Private provenance</span>
          <strong>How you found it</strong>
        </legend>
        <p className="form-section__description">
          These details remain visible only to you and administrators. They are
          never published as place information.
        </p>
        <div className="form-grid form-grid--two">
          <div className="form-field">
            <label htmlFor="submission-source-type">Source type</label>
            <select
              id="submission-source-type"
              name="sourceType"
              defaultValue={submission?.sourceType ?? ""}
            >
              <option value="">Not specified</option>
              <option value="friend">Friend</option>
              <option value="instagram">Instagram</option>
              <option value="publication">Travel publication or blog</option>
              <option value="website">Website</option>
              <option value="guidebook">Guidebook</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="submission-source-name">Source name</label>
            <input
              id="submission-source-name"
              maxLength={160}
              name="sourceName"
              defaultValue={submission?.sourceName ?? ""}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-source-url">Source URL</label>
            <input
              aria-describedby={describedBy(
                "submission-source-url-help",
                "submission-source-url-error",
                state.fieldErrors.sourceUrl,
              )}
              aria-invalid={Boolean(state.fieldErrors.sourceUrl)}
              id="submission-source-url"
              maxLength={2048}
              name="sourceUrl"
              placeholder="https://…"
              type="url"
              defaultValue={submission?.sourceUrl ?? ""}
            />
            <p className="field-help" id="submission-source-url-help">
              Public HTTPS links only.
            </p>
            <FieldError
              id="submission-source-url-error"
              message={state.fieldErrors.sourceUrl}
            />
          </div>
          <div className="form-field">
            <label htmlFor="submission-recommended-on">Date recommended</label>
            <input
              id="submission-recommended-on"
              name="recommendedOn"
              type="date"
              defaultValue={submission?.recommendedOn ?? ""}
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="submission-notes">Submission notes</label>
            <textarea
              id="submission-notes"
              maxLength={5000}
              name="submissionNotes"
              rows={4}
              defaultValue={submission?.submissionNotes ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <div className="submission-form__actions">
        <p>
          Saving keeps the draft private. Submitting sends it to the
          administration review queue.
        </p>
        <div>
          <button
            className="button-secondary"
            disabled={pending}
            name="intent"
            type="submit"
            value="draft"
          >
            {submission ? "Save changes" : "Save draft"}
          </button>
          <button
            className="button-primary"
            disabled={pending}
            name="intent"
            type="submit"
            value="submit"
          >
            {pending ? "Saving…" : "Submit for review"}
          </button>
        </div>
      </div>
    </form>
  );
}
