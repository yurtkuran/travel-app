"use client";

import { useId, useRef } from "react";

import { rejectSubmissionAction } from "./actions";

export function RejectSubmissionDialog({
  placeName,
  submissionId,
}: {
  placeName: string;
  submissionId: string;
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
        Reject submission
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="confirmation-dialog"
        ref={dialog}
      >
        <form
          action={rejectSubmissionAction}
          className="confirmation-dialog__content"
        >
          <input name="submissionId" type="hidden" value={submissionId} />
          <p className="eyebrow">Confirm rejection</p>
          <h2 id={titleId}>Reject {placeName}?</h2>
          <p id={descriptionId}>
            The submitter will see the reason. The place will remain private and
            cannot be published from this review.
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
              Reject submission
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
