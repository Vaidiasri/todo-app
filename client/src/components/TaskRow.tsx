import { SquarePen, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDeleteTask, useToggleStatus, type Task } from "../api/tasks";
import { dayLabel, timeLabel } from "../lib/week";
import { ConfirmDialog } from "./ConfirmDialog";
import { useSheet } from "./TaskSheet";

const CHIP = {
  low: "bg-divider text-muted-2",
  medium: "bg-complete-bg text-primary-strong",
  high: "bg-pending-bg text-danger",
} as const;

const OPEN = -88; // px the row slides to reveal Delete
let closeOpenRow: (() => void) | null = null; // only one row open at a time

export function TaskRow({ task, showDate = false }: { task: Task; showDate?: boolean }) {
  const done = task.status === "completed";
  const start = new Date(task.startAt);
  const time = task.endAt ? `${timeLabel(start)} to ${timeLabel(new Date(task.endAt))}` : timeLabel(start);
  const { openView, openEdit } = useSheet();
  const toggle = useToggleStatus();
  const del = useDeleteTask();
  const [confirming, setConfirming] = useState(false);

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x0: number; base: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const liRef = useRef<HTMLLIElement>(null);
  const isOpen = dx === OPEN;

  // While open: close on a tap anywhere else, and when another row opens.
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setDx(0);
    closeOpenRow?.();
    closeOpenRow = close;
    const onDown = (e: PointerEvent) => !liRef.current?.contains(e.target as Node) && close();
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      if (closeOpenRow === close) closeOpenRow = null;
    };
  }, [isOpen]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x0: e.clientX, base: dx, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(delta) < 8) return; // still a tap
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDx(Math.min(0, Math.max(OPEN, d.base + delta)));
  };
  const endDrag = () => {
    if (drag.current?.moved) {
      suppressClick.current = true; // the click that follows a drag is not a tap
      setDx((x) => (x < OPEN / 2 ? OPEN : 0));
    }
    drag.current = null;
    setDragging(false);
  };

  const iconBtn =
    "grid size-8 shrink-0 place-items-center rounded text-icon hover:text-ink focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <li ref={liRef} className="relative overflow-hidden border-b border-divider">
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        aria-hidden={!isOpen}
        onClick={() => del.mutate(task.id)}
        className={`absolute inset-y-0 right-0 w-[88px] bg-danger ${dx === 0 ? "invisible" : ""} text-sm font-medium text-white focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white`}
      >
        Delete
      </button>
      <div
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }}
        className={`relative flex min-h-16 touch-pan-y items-center gap-2 bg-page py-3 select-none ${dragging ? "" : "transition-transform duration-200"}`}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark "${task.title}" ${done ? "in progress" : "completed"}`}
          onClick={() => toggle.mutate(task)}
          className={`-ml-1.5 grid size-8 shrink-0 place-items-center rounded focus-visible:outline-2 focus-visible:outline-primary`}
        >
          <span className={`grid size-5 place-items-center rounded-sm border border-primary ${done ? "text-primary" : ""}`}>
            {done && (
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => openView(task.id)}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className={`block truncate text-[15px] font-medium ${done ? "text-muted line-through" : ""}`}>{task.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {showDate ? `${dayLabel(start)} · ${time}` : time}
            <span className="sr-only">, {done ? "completed" : "in progress"}</span>
          </span>
        </button>
        {task.priority && (
          <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium capitalize ${CHIP[task.priority]}`}>
            {task.priority}
          </span>
        )}
        <button type="button" aria-label={`Delete "${task.title}"`} onClick={() => setConfirming(true)} className={iconBtn}>
          <Trash2 size={22} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" aria-label={`Edit "${task.title}"`} onClick={() => openEdit(task.id)} className={`${iconBtn} -mr-1`}>
          <SquarePen size={22} strokeWidth={1.5} aria-hidden />
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
        }}
      />
    </li>
  );
}
