"use client";

import { useId, useRef } from "react";

import { rejectProposalAction } from "./actions";

export function RejectProposalDialog({
  placeName,
  proposalId,
}: {
  placeName: string;
  proposalId: string;
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
        Reject proposal
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="confirmation-dialog"
        ref={dialog}
      >
        <form
          action={rejectProposalAction}
          className="confirmation-dialog__content"
        >
          <input name="proposalId" type="hidden" value={proposalId} />
          <p className="eyebrow">Confirm rejection</p>
          <h2 id={titleId}>Reject the edit to {placeName}?</h2>
          <p id={descriptionId}>
            The published place will remain unchanged and the submitter will see
            your reason.
          </p>
          <div className="form-field confirmation-dialog__field">
            <label htmlFor={`${descriptionId}-reason`}>Reason</label>
            <textarea
              id={`${descriptionId}-reason`}
              maxLength={2000}
              name="reason"
              required
              rows={4}
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
              Reject proposal
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
