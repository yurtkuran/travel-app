"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialLinkActionState } from "../action-state";
import { provisionUserAction } from "../actions";
import { SetupLinkResult } from "../setup-link-result";

export function ProvisionForm() {
  const [state, action, pending] = useActionState(
    provisionUserAction,
    initialLinkActionState,
  );
  return (
    <div className="account-administration-form">
      <SetupLinkResult state={state} />
      {state.status !== "success" ? (
        <form action={action} className="form-section">
          <div className="form-grid form-grid--two">
            <div className="form-field">
              <label htmlFor="provision-name">Name</label>
              <input
                autoComplete="off"
                data-1p-ignore="true"
                id="provision-name"
                maxLength={160}
                name="name"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="provision-email">Email address</label>
              <input
                autoComplete="off"
                data-1p-ignore="true"
                id="provision-email"
                name="email"
                required
                type="email"
              />
            </div>
          </div>
          <div className="provision-form__footer">
            <ul>
              <li>
                New accounts always begin with the user role. Promote an
                activated account separately when administrative access is
                required.
              </li>
              <li>
                The generated link expires after 72 hours and is shown once.
              </li>
            </ul>
            <button className="button-primary" disabled={pending} type="submit">
              {pending ? "Provisioning…" : "Provision user"}
            </button>
          </div>
        </form>
      ) : state.userId ? (
        <div className="proposal-actions account-administration-form__actions">
          <Link
            className="button-primary"
            href={`/admin/users/${state.userId}`}
          >
            Manage account
          </Link>
          <Link className="button-secondary" href="/admin/users/new">
            Provision another user
          </Link>
        </div>
      ) : null}
    </div>
  );
}
