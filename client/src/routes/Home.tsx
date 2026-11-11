import { useState } from "react";
import { useRangeTasks } from "../api/tasks";
import { Fab } from "../components/Fab";
import { SearchBar } from "../components/SearchBar";
import { TaskRow } from "../components/TaskRow";
import { TaskSheet, useSheet } from "../components/TaskSheet";
import { WeekStrip } from "../components/WeekStrip";
import { addDays, dayKey, dayLabel, sameDay, startOfWeek } from "../lib/week";

export default function Home() {
  const [selected, setSelected] = useState(() => new Date());
  const weekStart = startOfWeek(selected);
  const tasks = useRangeTasks(weekStart, addDays(weekStart, 7));
  const { openNew } = useSheet();

  const items = tasks.data ?? [];
  const daysWithTasks = new Set(items.map((t) => dayKey(new Date(t.startAt))));
  const dayTasks = items.filter((t) => sameDay(new Date(t.startAt), selected)); // API sorts by startAt
  const isToday = sameDay(selected, new Date());

  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-6 pt-6 pb-32">
      <SearchBar />
      <WeekStrip selected={selected} onSelect={setSelected} daysWithTasks={daysWithTasks} />

      <section aria-labelledby="day-heading" className="mt-8">
        <h2 id="day-heading" className="text-lg font-semibold">
          {isToday ? "Tasks Today" : dayLabel(selected)}
        </h2>

        {tasks.isPending ? (
          <ul aria-label="Loading tasks" className="mt-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="my-4 h-10 animate-pulse rounded bg-divider" />
            ))}
          </ul>
        ) : tasks.isError && !tasks.data ? (
          <div role="alert" className="mt-4 text-sm text-danger">
            Could not load tasks.{" "}
            <button type="button" onClick={() => tasks.refetch()} className="font-medium text-primary underline">
              Retry
            </button>
          </div>
        ) : dayTasks.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No tasks for this day. Tap + to add one.</p>
        ) : (
          <ul className="mt-2">
            {dayTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </section>

      <Fab onClick={() => openNew(selected)} />
      <TaskSheet onCreated={(t) => setSelected(new Date(t.startAt))} />
    </main>
  );
}
