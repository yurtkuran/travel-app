"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { initialTaxonomyActionState } from "@/features/taxonomy/action-state";
import { countries } from "@/features/taxonomy/countries";
import { usStates } from "@/features/taxonomy/us-states";

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
  const [countryCode, setCountryCode] = useState("US");

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.revision, state.status]);

  return (
    <form
      action={action}
      className="taxonomy-form"
      onReset={() => setCountryCode("US")}
      ref={formRef}
    >
      <div className="taxonomy-form__heading">
        <div>
          <h2>Add a city</h2>
        </div>
        <p>City, region, and country together must be unique.</p>
      </div>
      {state.message ? (
        <FeedbackBanner tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FeedbackBanner>
      ) : null}
      <div className="form-grid form-grid--three">
        <div className="form-field">
          <label htmlFor="city-name">City name</label>
          <input
            aria-describedby={
              state.fieldErrors.name ? "city-name-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.name)}
            autoComplete="off"
            data-1p-ignore="true"
            id="city-name"
            maxLength={160}
            name="name"
            required
          />
          <FieldError id="city-name-error" message={state.fieldErrors.name} />
        </div>
        <div className="form-field">
          <label htmlFor="city-region">
            {countryCode === "US" ? "State" : "State or region"}
          </label>
          {countryCode === "US" ? (
            <select
              aria-describedby={
                state.fieldErrors.region ? "city-region-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.region)}
              autoComplete="off"
              data-1p-ignore="true"
              id="city-region"
              key="us-state"
              name="region"
              required
            >
              <option value="">Select a state</option>
              {usStates.map((state) => (
                <option key={state.code} value={state.name}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          ) : (
            <input
              aria-describedby={
                state.fieldErrors.region ? "city-region-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.region)}
              autoComplete="off"
              data-1p-ignore="true"
              id="city-region"
              key="international-region"
              maxLength={160}
              name="region"
            />
          )}
          <FieldError
            id="city-region-error"
            message={state.fieldErrors.region}
          />
        </div>
        <div className="form-field">
          <label htmlFor="city-country">Country</label>
          <select
            aria-describedby={
              state.fieldErrors.countryCode ? "city-country-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.countryCode)}
            autoComplete="off"
            data-1p-ignore="true"
            id="city-country"
            name="countryCode"
            onChange={(event) => setCountryCode(event.target.value)}
            required
            value={countryCode}
          >
            <option value="">Select a country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <FieldError
            id="city-country-error"
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
