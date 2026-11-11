import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { ApiError } from "../api/client";
import { useDeleteTask, useTask, type Task } from "../api/tasks";
import { dayKey, longDateLabel, parseDayKey, timeLabel } from "../lib/week";
import { ConfirmDialog } from "./ConfirmDialog";
import { TaskForm } from "./TaskForm";
import { toast } from "./Toaster";

const MODES = ["new", "view", "edit"] as const;
type Mode = (typeof MODES)[number];
const TITLES: Record<Mode, string> = { new: "Add New Task", view: "Task details", edit: "Edit Task" };

/** Sheet state lives in the URL (?sheet=new&date=, ?sheet=view&id=, ?sheet=edit&id=), so back closes it. */
export function useSheet() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const open = (set: Record<string, string>, replace = false) => {
    const p = new URLSearchParams(params);
    ["sheet", "date", "id"].forEach((k) => p.delete(k));
    Object.entries(set).forEach(([k, v]) => p.set(k, v));
    // Switching view to edit replaces the entry, so one back still closes the sheet.
    navigate({ search: `?${p}` }, { replace, state: { sheet: true } });
  };

  const close = () => {
    // Opened from inside the app: step back so the history has no dangling "open" entry.
    if (location.state?.sheet) return navigate(-1);
    const p = new URLSearchParams(params);
    ["sheet", "date", "id"].forEach((k) => p.delete(k));
    setParams(p, { replace: true });
  };

  const sheet = params.get("sheet");
  return {
    mode: (MODES as readonly string[]).includes(sheet ?? "") ? (sheet as Mode) : null,
    date: params.get("date"),
    id: params.get("id"),
    openNew: (date: Date) => open({ sheet: "new", date: dayKey(date) }),
    openView: (id: string) => open({ sheet: "view", id }),
    openEdit: (id: string, fromView = false) => open({ sheet: "edit", id }, fromView),
    close,
  };
}

export function TaskSheet({ onCreated }: { onCreated?: (t: Task) => void }) {
  const { mode, date, id, close, openEdit } = useSheet();
  const ref = useRef<HTMLDialogElement>(null);
  const open = mode !== null;
  const task = useTask(mode === "new" ? null : id);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("input")?.focus(); // showModal focuses the close button first
    }
    if (!open && d.open) d.close();
  }, [open]);

  const missing = task.error instanceof ApiError && task.error.status === 404;

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      // Esc: drive the close from the URL. Chrome fires `close` up to ~1s late, `cancel` fires at once.
      // React bubbles both from the nested ConfirmDialog, so only act on our own dialog.
      onCancel={(e) => e.target === e.currentTarget && (e.preventDefault(), close())}
      onClose={(e) => e.target === e.currentTarget && open && close()}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-0 mt-auto w-full max-w-full overflow-hidden rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-overlay sm:m-auto sm:max-w-[480px] sm:rounded"
    >
      {mode && (
        <div className="flex max-h-[92dvh] flex-col sm:max-h-[85dvh]">
          <header className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 id="sheet-title" className="text-lg font-medium">
              {TITLES[mode]}
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

          {mode === "new" ? (
            <TaskForm
              defaultDate={parseDayKey(date) ? date! : dayKey(new Date())}
              onSaved={(t) => {
                toast("Task created");
                onCreated?.(t);
                close();
              }}
            />
          ) : task.data ? (
            mode === "edit" ? (
              <TaskForm
                key={task.data.id}
                defaultDate={dayKey(new Date(task.data.startAt))}
                initial={task.data}
                onSaved={() => {
                  toast("Task updated");
                  close();
                }}
              />
            ) : (
              <TaskDetails task={task.data} onEdit={() => openEdit(task.data!.id, true)} onDeleted={close} />
            )
          ) : (
            <div className="px-6 pb-8">
              {task.isPending ? (
                <div aria-label="Loading task" className="space-y-3">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-divider" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-divider" />
                </div>
              ) : (
                <p role="alert" className="text-sm text-danger">
                  {missing ? "This task no longer exists." : "Could not load the task."}{" "}
                  {!missing && (
                    <button type="button" onClick={() => task.refetch()} className="font-medium text-primary underline">
                      Retry
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

function TaskDetails({ task, onEdit, onDeleted }: { task: Task; onEdit: () => void; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteTask();
  const start = new Date(task.startAt);
  const time = task.endAt ? `${timeLabel(start)} to ${timeLabel(new Date(task.endAt))}` : timeLabel(start);
  const rows: [string, string][] = [
    ["Date", longDateLabel(start)],
    ["Time", time],
    ["Priority", task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : "None"],
    ["Status", task.status === "completed" ? "Completed" : "In progress"],
    ["Description", task.description || "No description"],
  ];
  const btn = "h-12 flex-1 rounded text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <p className="text-xl font-semibold break-words">{task.title}</p>
        <dl className="mt-4 space-y-4">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-1 text-sm break-words whitespace-pre-wrap">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex gap-3 border-t border-divider bg-surface px-6 pt-3 pb-6">
        <button type="button" onClick={() => setConfirming(true)} className={`${btn} border border-danger text-danger`}>
          Delete
        </button>
        <button type="button" onClick={onEdit} className={`${btn} bg-primary text-white hover:bg-primary-strong`}>
          Edit
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete this task?"
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          del.mutate(task.id);
          onDeleted();
        }}
      />
    </>
  );
}
