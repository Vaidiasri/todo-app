import { SquareCheck, SquareX } from "lucide-react";
import { useState } from "react";
import { useRangeTasks, useWeeks } from "../api/tasks";
import { Fab } from "../components/Fab";
import { ListState } from "../components/ListState";
import { SearchBar } from "../components/SearchBar";
import { TaskRow } from "../components/TaskRow";
import { TaskSheet, useSheet } from "../components/TaskSheet";
import { WeekCard } from "../components/WeekCard";
import { WeekStrip } from "../components/WeekStrip";
import { addDays, dayKey, dayLabel, sameDay, startOfWeek } from "../lib/week";

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  const [selected, setSelected] = useState(() => new Date());
  const [openWeeks, setOpenWeeks] = useState<number[]>([]);
  const weekStart = startOfWeek(selected);
  const tasks = useRangeTasks(weekStart, addDays(weekStart, 7));
  const weeks = useWeeks();
  const { openNew } = useSheet();

  const items = tasks.data ?? [];
  const daysWithTasks = new Set(items.map((t) => dayKey(new Date(t.startAt))));
  const dayTasks = items.filter((t) => sameDay(new Date(t.startAt), selected)); // API sorts by startAt
  const isToday = sameDay(selected, new Date());
  const completed = items.filter((t) => t.status === "completed").length;
  const pending = items.length - completed;
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;

  const toggleWeek = (ws: number) => setOpenWeeks((s) => (s.includes(ws) ? s.filter((x) => x !== ws) : [...s, ws]));
  const viewAll = () => {
    const ws = weekStart.getTime();
    setOpenWeeks((s) => (s.includes(ws) ? s : [...s, ws]));
    document.getElementById("all-weeks")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    // Desktop (lg): the overview column stays put on the left, task lists scroll on the right. Mobile is the Figma column.
    <main className="mx-auto min-h-dvh max-w-[480px] px-6 pt-6 pb-32 lg:grid lg:max-w-[1120px] lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-x-12 lg:px-10 lg:pt-10">
      <div className="lg:sticky lg:top-10">
        <SearchBar />
        <WeekStrip selected={selected} onSelect={setSelected} daysWithTasks={daysWithTasks} />

        <section aria-label="This week's counts" className="mt-6 grid grid-cols-2 gap-4">
          <StatCard label="Task Complete" count={completed} tone="complete" loading={tasks.isPending} />
          <StatCard label="Task Pending" count={pending} tone="pending" loading={tasks.isPending} />
        </section>

        <section aria-labelledby="progress-heading" className="mt-8">
          <h2 id="progress-heading" className="text-lg font-semibold">
            Weekly Progress
          </h2>
          <div
            role="progressbar"
            aria-labelledby="progress-heading"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${completed} of ${items.length} tasks completed`}
            className="mt-3 h-6 bg-progress-track"
          >
            <div className="h-full bg-primary-strong transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </section>
      </div>

      <div>
        <section aria-labelledby="day-heading" className="mt-8 lg:mt-0 lg:rounded lg:border lg:border-border lg:bg-surface lg:p-6">
          <div className="flex items-baseline justify-between">
            <h2 id="day-heading" className="text-lg font-semibold">
              {isToday ? "Tasks Today" : dayLabel(selected)}
            </h2>
            <button type="button" onClick={viewAll} className="rounded text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary">
              View All
            </button>
          </div>
          <ListState query={tasks} isEmpty={!tasks.isPending && dayTasks.length === 0} empty="No tasks for this day. Tap + to add one.">
            <ul className="mt-2">
              {dayTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </ListState>
        </section>

        <section id="all-weeks" aria-labelledby="weeks-heading" className="mt-8 scroll-mt-6 lg:scroll-mt-10">
          <h2 id="weeks-heading" className="text-lg font-semibold">
            All weeks
          </h2>
          <ListState query={weeks} empty="No tasks yet. Weeks show up here once you add one.">
            <ul className="mt-3 space-y-3">
              {weeks.data?.map((w) => {
                const ws = new Date(w.weekStart).getTime();
                return <WeekCard key={w.weekStart} week={w} expanded={openWeeks.includes(ws)} onToggle={() => toggleWeek(ws)} />;
              })}
            </ul>
          </ListState>
        </section>
      </div>

      <Fab onClick={() => openNew(selected)} />
      <TaskSheet onCreated={(t) => setSelected(new Date(t.startAt))} />
    </main>
  );
}

function StatCard({ label, count, tone, loading }: { label: string; count: number; tone: "complete" | "pending"; loading: boolean }) {
  const c = tone === "complete";
  const Icon = c ? SquareCheck : SquareX;
  return (
    <div className={`flex min-h-24 gap-2 rounded p-3 ${c ? "bg-complete-bg text-complete-ink" : "bg-pending-bg text-danger"}`}>
      <span className={`grid size-7 shrink-0 place-items-center rounded ${c ? "bg-primary/20" : "bg-danger/15"}`}>
        <Icon size={20} strokeWidth={1.5} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] leading-7 text-ink">{label}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-ink">
          <span className={`text-2xl font-semibold ${loading ? "opacity-40" : ""}`}>{pad2(count)}</span>
          <span className="text-[11px] text-muted-2">This Week</span>
        </p>
      </div>
    </div>
  );
}
