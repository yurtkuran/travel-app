"use client";

import { useActionState, useEffect, useRef } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { initialTaxonomyActionState } from "@/features/taxonomy/action-state";

import { createCityAction } from "./actions";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="field-error" id={id}>
      {message}
    </p>
  ) : null;
}

export function CityForm() {
  const [state, action, pending] = useActionState(
    createCityAction,
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
          <p className="eyebrow">New geography</p>
          <h2>Add a city</h2>
        </div>
        <p>City, region, and country together must be unique.</p>
      </div>
      {state.message ? (
        <FeedbackBanner tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FeedbackBanner>
      ) : null}
      <div className="form-grid form-grid--two">
        <div className="form-field">
          <label htmlFor="city-name">City name</label>
          <input
            aria-describedby={
              state.fieldErrors.name ? "city-name-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.name)}
            id="city-name"
            maxLength={160}
            name="name"
            required
          />
          <FieldError id="city-name-error" message={state.fieldErrors.name} />
        </div>
        <div className="form-field">
          <label htmlFor="city-region">State or region</label>
          <input
            aria-describedby={
              state.fieldErrors.region ? "city-region-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.region)}
            id="city-region"
            maxLength={160}
            name="region"
          />
          <FieldError
            id="city-region-error"
            message={state.fieldErrors.region}
          />
        </div>
        <div className="form-field">
          <label htmlFor="city-country">Country</label>
          <input
            aria-describedby={
              state.fieldErrors.country ? "city-country-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.country)}
            id="city-country"
            maxLength={120}
            name="country"
            required
          />
          <FieldError
            id="city-country-error"
            message={state.fieldErrors.country}
          />
        </div>
        <div className="form-field">
          <label htmlFor="city-country-code">Country code</label>
          <input
            aria-describedby={`city-country-code-help${state.fieldErrors.countryCode ? " city-country-code-error" : ""}`}
            aria-invalid={Boolean(state.fieldErrors.countryCode)}
            autoCapitalize="characters"
            id="city-country-code"
            maxLength={2}
            name="countryCode"
            pattern="[A-Za-z]{2}"
          />
          <p className="field-help" id="city-country-code-help">
            Optional two-letter ISO code, such as US or FR.
          </p>
          <FieldError
            id="city-country-code-error"
            message={state.fieldErrors.countryCode}
          />
        </div>
      </div>
      <div className="taxonomy-form__actions">
        <button className="button-primary" disabled={pending} type="submit">
          {pending ? "Adding city…" : "Add city"}
        </button>
      </div>
    </form>
  );
}
