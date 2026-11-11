"use client";

import { useActionState } from "react";

import { initialLinkActionState } from "../action-state";
import { recoveryLinkAction } from "../actions";
import { SetupLinkResult } from "../setup-link-result";

export function RecoveryControl({
  activated,
  userId,
}: {
  activated: boolean;
  userId: string;
}) {
  const [state, action, pending] = useActionState(
    recoveryLinkAction,
    initialLinkActionState,
  );
  return (
    <section className="account-management-section">
      <div>
        <p className="eyebrow">Credential recovery</p>
        <h2>{activated ? "Reset account access" : "Replace setup link"}</h2>
        <p>
          Generating a link revokes every active session and any previous unused
          setup or recovery link.
        </p>
      </div>
      <SetupLinkResult state={state} />
      {state.status !== "success" ? (
        <form action={action}>
          <input name="userId" type="hidden" value={userId} />
          <button className="button-secondary" disabled={pending} type="submit">
            {pending
              ? "Generating…"
              : activated
                ? "Generate recovery link"
                : "Generate replacement link"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
