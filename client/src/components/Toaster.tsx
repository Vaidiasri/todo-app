import { useSyncExternalStore } from "react";

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
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div key={t.id} className="rounded bg-ink px-4 py-3 text-sm text-white shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}
