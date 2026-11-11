import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import type { Task } from "../api/tasks";
import { dayKey, parseDayKey } from "../lib/week";
import { TaskForm } from "./TaskForm";
import { toast } from "./Toaster";

/** Sheet state lives in the URL (?sheet=new&date=YYYY-MM-DD), so the back button closes it. */
export function useSheet() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const openNew = (date: Date) => {
    const p = new URLSearchParams(params);
    p.set("sheet", "new");
    p.set("date", dayKey(date));
    navigate({ search: `?${p}` }, { state: { sheet: true } });
  };

  const close = () => {
    // Opened from inside the app: step back so the history has no dangling "open" entry.
    if (location.state?.sheet) return navigate(-1);
    const p = new URLSearchParams(params);
    ["sheet", "date", "id"].forEach((k) => p.delete(k));
    setParams(p, { replace: true });
  };

  return { sheet: params.get("sheet"), date: params.get("date"), openNew, close };
}

export function TaskSheet({ onCreated }: { onCreated?: (t: Task) => void }) {
  const { sheet, date, close } = useSheet();
  const ref = useRef<HTMLDialogElement>(null);
  const open = sheet === "new";

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("input")?.focus(); // showModal focuses the close button first
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      // Esc closes the dialog natively; keep the URL in step.
      onClose={() => open && close()}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-0 mt-auto w-full max-w-full overflow-hidden rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-overlay sm:m-auto sm:max-w-[480px] sm:rounded"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col sm:max-h-[85dvh]">
          <header className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 id="sheet-title" className="text-lg font-medium">
              Add New Task
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full hover:bg-complete-bg focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X size={22} aria-hidden />
            </button>
          </header>
          <TaskForm
            defaultDate={parseDayKey(date) ? date! : dayKey(new Date())}
            onCreated={(t) => {
              toast("Task created");
              onCreated?.(t);
              close();
            }}
          />
        </div>
      )}
    </dialog>
  );
}
