"use client";

import { useId, useRef, useState } from "react";

export function ConfirmationDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  onConfirm,
  title,
  triggerLabel,
  variant = "secondary",
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  title: string;
  triggerLabel: string;
  variant?: "danger" | "secondary";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const descriptionId = useId();
  const titleId = useId();
  const [pending, setPending] = useState(false);

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      dialogRef.current?.close();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className={variant === "danger" ? "button-danger" : "button-secondary"}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="confirmation-dialog"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        ref={dialogRef}
      >
        <div className="confirmation-dialog__content">
          <p className="eyebrow">Please confirm</p>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
          <div className="confirmation-dialog__actions">
            <button
              className="button-secondary"
              disabled={pending}
              onClick={close}
              type="button"
            >
              {cancelLabel}
            </button>
            <button
              className={
                variant === "danger" ? "button-danger" : "button-primary"
              }
              disabled={pending}
              onClick={confirm}
              type="button"
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
