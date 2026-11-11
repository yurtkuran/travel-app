"use client";

import { useState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";

import type { LinkActionState } from "./action-state";

export function SetupLinkResult({ state }: { state: LinkActionState }) {
  const [copied, setCopied] = useState(false);
  if (!state.message) return null;
  if (state.status === "error") {
    return <FeedbackBanner tone="error">{state.message}</FeedbackBanner>;
  }
  return (
    <FeedbackBanner title="Single-use link ready" tone="success">
      <p>{state.message}</p>
      {state.setupUrl ? (
        <div className="setup-link-result">
          <label htmlFor={`setup-link-${state.userId}`}>Setup link</label>
          <input
            id={`setup-link-${state.userId}`}
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={state.setupUrl}
          />
          <button
            className="button-secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(state.setupUrl ?? "");
              setCopied(true);
            }}
            type="button"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          {state.expiresAt ? (
            <p>Expires {new Date(state.expiresAt).toLocaleString("en-US")}.</p>
          ) : null}
        </div>
      ) : null}
    </FeedbackBanner>
  );
}
