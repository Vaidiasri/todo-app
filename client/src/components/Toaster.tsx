import { useEffect, useRef, useSyncExternalStore } from "react";

type Toast = { id: number; text: string };

// ponytail: module level store, enough for one app; slice 7 adds styling variants if needed.
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string) {
  const id = nextId++;
  toasts = [...toasts, { id, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3500);
}

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts);
  const ref = useRef<HTMLDivElement>(null);

  // Re-enter the top layer on each toast so it paints above any open modal dialog.
  useEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    if (el.matches(":popover-open")) el.hidePopover();
    if (list.length) el.showPopover();
  }, [list]);

  return (
    <div
      ref={ref}
      popover="manual"
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 m-0 flex w-auto flex-col items-center gap-2 overflow-visible border-0 bg-transparent px-4 py-0"
    >
      {list.map((t) => (
        <div key={t.id} className="rounded bg-ink px-4 py-3 text-sm text-white shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}
