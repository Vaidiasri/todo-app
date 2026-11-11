import { useEffect, useId, useRef } from "react";

/** Small modal confirm. Esc or Cancel calls onCancel. */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("[data-cancel]")?.focus(); // safe default for a destructive prompt
    }
    if (!open && d.open) d.close();
  }, [open]);

  const btn = "h-11 flex-1 rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => (e.preventDefault(), onCancel())} // `close` can fire ~1s late in Chrome
      onClose={() => open && onCancel()}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="m-auto w-[calc(100%-48px)] max-w-[360px] rounded bg-surface p-6 text-ink backdrop:bg-overlay"
    >
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted">This cannot be undone.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" data-cancel onClick={onCancel} className={`${btn} border border-border`}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={`${btn} bg-danger text-white`}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
