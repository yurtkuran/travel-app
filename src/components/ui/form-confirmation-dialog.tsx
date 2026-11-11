"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function DialogActions({
  cancelLabel,
  close,
  confirmLabel,
  onPendingChange,
  variant,
}: {
  cancelLabel: string;
  close: () => void;
  confirmLabel: string;
  onPendingChange: (pending: boolean) => void;
  variant: "danger" | "secondary";
}) {
  const { pending } = useFormStatus();
  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);
  return (
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
        className={variant === "danger" ? "button-danger" : "button-primary"}
        disabled={pending}
        type="submit"
      >
        {pending ? "Working…" : confirmLabel}
      </button>
    </div>
  );
}

export function FormConfirmationDialog({
  action,
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  fields,
  title,
  triggerLabel,
  variant = "danger",
}: {
  action: (formData: FormData) => Promise<void> | void;
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  fields: Record<string, string>;
  title: string;
  triggerLabel: string;
  variant?: "danger" | "secondary";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const descriptionId = useId();
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const close = () => dialogRef.current?.close();

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
        <form action={action} className="confirmation-dialog__content">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <p className="eyebrow">Please confirm</p>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
          <DialogActions
            cancelLabel={cancelLabel}
            close={close}
            confirmLabel={confirmLabel}
            onPendingChange={setPending}
            variant={variant}
          />
        </form>
      </dialog>
    </>
  );
}
