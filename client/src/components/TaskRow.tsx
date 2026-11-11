import type { Task } from "../api/tasks";
import { timeLabel } from "../lib/week";

const CHIP = {
  low: "bg-divider text-muted",
  medium: "bg-complete-bg text-primary",
  high: "bg-pending-bg text-danger",
} as const;

// Read only in slice 1. Checkbox toggling, edit, delete and swipe arrive in slices 2 and 3.
export function TaskRow({ task }: { task: Task }) {
  const done = task.status === "completed";
  const start = timeLabel(new Date(task.startAt));
  const time = task.endAt ? `${start} to ${timeLabel(new Date(task.endAt))}` : start;

  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-divider py-3">
      <span
        role="img"
        aria-label={done ? "Completed" : "In progress"}
        className={`grid size-5 shrink-0 place-items-center rounded-sm border border-primary ${done ? "text-primary" : ""}`}
      >
        {done && (
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
        <p className="mt-0.5 text-xs text-muted">{time}</p>
      </div>
      {task.priority && (
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium capitalize ${CHIP[task.priority]}`}>
          {task.priority}
        </span>
      )}
    </li>
  );
}
