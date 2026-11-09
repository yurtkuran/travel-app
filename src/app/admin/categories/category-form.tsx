"use client";

import { useActionState, useEffect, useRef } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { initialTaxonomyActionState } from "@/features/taxonomy/action-state";

import { createCategoryAction } from "./actions";

export function CategoryForm({
  dimensions,
}: {
  dimensions: { description: string | null; id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(
    createCategoryAction,
    initialTaxonomyActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.revision, state.status]);

  return (
    <form action={action} className="taxonomy-form" ref={formRef}>
      <div className="taxonomy-form__heading">
        <div>
          <p className="eyebrow">New classification</p>
          <h2>Add a category</h2>
        </div>
        <p>Rating dimensions can be enabled now or managed later.</p>
      </div>
      {state.message ? (
        <FeedbackBanner tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FeedbackBanner>
      ) : null}
      <div className="form-grid form-grid--two">
        <div className="form-field">
          <label htmlFor="category-name">Category name</label>
          <input
            aria-describedby={
              state.fieldErrors.name ? "category-name-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.name)}
            id="category-name"
            maxLength={80}
            name="name"
            required
          />
          {state.fieldErrors.name ? (
            <p className="field-error" id="category-name-error">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="category-display-order">Display order</label>
          <input
            aria-describedby={
              state.fieldErrors.displayOrder
                ? "category-display-order-error"
                : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.displayOrder)}
            defaultValue="70"
            id="category-display-order"
            max={10000}
            min={0}
            name="displayOrder"
            required
            type="number"
          />
          {state.fieldErrors.displayOrder ? (
            <p className="field-error" id="category-display-order-error">
              {state.fieldErrors.displayOrder}
            </p>
          ) : null}
        </div>
        <div className="form-field form-grid__wide">
          <label htmlFor="category-description">Description</label>
          <textarea
            aria-describedby={
              state.fieldErrors.description
                ? "category-description-error"
                : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.description)}
            id="category-description"
            maxLength={500}
            name="description"
            rows={3}
          />
          {state.fieldErrors.description ? (
            <p className="field-error" id="category-description-error">
              {state.fieldErrors.description}
            </p>
          ) : null}
        </div>
      </div>
      <fieldset className="checkbox-fieldset">
        <legend>Optional rating dimensions</legend>
        <div className="checkbox-grid">
          {dimensions.map((dimension) => (
            <label className="checkbox-card" key={dimension.id}>
              <input
                name="ratingDimensionIds"
                type="checkbox"
                value={dimension.id}
              />
              <span>
                <strong>{dimension.name}</strong>
                {dimension.description ? (
                  <small>{dimension.description}</small>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="taxonomy-form__actions">
        <button className="button-primary" disabled={pending} type="submit">
          {pending ? "Adding category…" : "Add category"}
        </button>
      </div>
    </form>
  );
}
