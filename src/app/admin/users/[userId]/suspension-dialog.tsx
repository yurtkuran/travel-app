"use client";

import { useId, useRef } from "react";

import { setSuspensionAction } from "../actions";

export function SuspensionControl({
  banned,
  name,
  userId,
}: {
  banned: boolean;
  name: string;
  userId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  if (banned) {
    return (
      <form action={setSuspensionAction}>
        <input name="userId" type="hidden" value={userId} />
        <input name="suspended" type="hidden" value="false" />
        <button className="button-secondary" type="submit">
          Restore account
        </button>
      </form>
    );
  }
  return (
    <>
      <button
        className="button-danger"
        onClick={() => dialog.current?.showModal()}
        type="button"
      >
        Suspend account
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="confirmation-dialog"
        ref={dialog}
      >
        <form
          action={setSuspensionAction}
          className="confirmation-dialog__content"
        >
          <input name="userId" type="hidden" value={userId} />
          <input name="suspended" type="hidden" value="true" />
          <p className="eyebrow">Revoke access</p>
          <h2 id={titleId}>Suspend {name}?</h2>
          <p id={descriptionId}>
            Active sessions and unused setup links will be revoked immediately.
            Private visits remain stored and inaccessible to administrators.
          </p>
          <div className="form-field confirmation-dialog__field">
            <label htmlFor={`${descriptionId}-reason`}>Reason</label>
            <textarea
              id={`${descriptionId}-reason`}
              maxLength={500}
              name="reason"
              required
              rows={3}
            />
          </div>
          <div className="confirmation-dialog__actions">
            <button
              className="button-secondary"
              onClick={() => dialog.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <button className="button-danger" type="submit">
              Suspend account
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
