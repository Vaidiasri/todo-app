import { ChevronDown } from "lucide-react";
import { useRangeTasks, type Week } from "../api/tasks";
import { addDays, dayKey, dayLabel, startOfWeek, weekRangeLabel } from "../lib/week";
import { ListState } from "./ListState";
import { TaskRow } from "./TaskRow";

export function WeekCard({ week, expanded, onToggle }: { week: Week; expanded: boolean; onToggle: () => void }) {
  const start = new Date(week.weekStart);
  const tasks = useRangeTasks(start, addDays(start, 7), expanded); // fetched on first expand
  const thisWeek = start.getTime() === startOfWeek(new Date()).getTime();
  const panelId = `week-${dayKey(start)}`;

  const byDay = new Map<string, NonNullable<typeof tasks.data>>();
  for (const t of tasks.data ?? []) {
    const k = dayKey(new Date(t.startAt));
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }

  return (
    <li className="rounded border border-border bg-surface">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium">{weekRangeLabel(start)}</span>
            {thisWeek && <span className="rounded bg-complete-bg px-2 py-0.5 text-[11px] font-medium text-primary">This week</span>}
          </span>
          <span className="mt-1 block text-xs text-muted">
            Open {week.open} · Completed {week.completed}
          </span>
        </span>
        <ChevronDown size={20} aria-hidden className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div id={panelId} className="border-t border-divider px-4 pb-2">
          <ListState query={tasks} empty="No tasks this week.">
            {[...byDay].map(([k, list]) => (
              <section key={k} aria-label={dayLabel(new Date(list[0].startAt))}>
                <h4 className="pt-3 text-xs font-medium text-muted-2">{dayLabel(new Date(list[0].startAt))}</h4>
                <ul>
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              </section>
            ))}
          </ListState>
        </div>
      )}
    </li>
  );
}
