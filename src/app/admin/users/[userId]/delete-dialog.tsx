"use client";

import { useId, useRef } from "react";

import { deleteUserAction } from "../actions";

export function DeleteUserDialog({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  return (
    <>
      <button
        className="button-danger"
        onClick={() => dialog.current?.showModal()}
        type="button"
      >
        Delete account
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="confirmation-dialog"
        ref={dialog}
      >
        <form
          action={deleteUserAction}
          className="confirmation-dialog__content"
        >
          <input name="userId" type="hidden" value={userId} />
          <p className="eyebrow">Permanent account deletion</p>
          <h2 id={titleId}>Delete {email}?</h2>
          <p id={descriptionId}>
            Private visits will be permanently deleted, public reviews removed,
            and pending contributions withdrawn. Published canonical places
            remain.
          </p>
          <div className="form-field confirmation-dialog__field">
            <label htmlFor={`${descriptionId}-confirmation`}>
              Type {email} to confirm
            </label>
            <input
              autoComplete="off"
              id={`${descriptionId}-confirmation`}
              name="confirmation"
              required
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
              Permanently delete
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
