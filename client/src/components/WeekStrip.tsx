import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayKey, sameDay, startOfWeek, weekRangeLabel, weekdayAbbr } from "../lib/week";

const fullDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

interface Props {
  selected: Date;
  onSelect: (d: Date) => void;
  daysWithTasks: Set<string>;
}

export function WeekStrip({ selected, onSelect, daysWithTasks }: Props) {
  const weekStart = startOfWeek(selected);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const iconBtn =
    "grid size-9 place-items-center rounded-full text-ink hover:bg-complete-bg focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <section aria-label="Week" className="mt-6">
      <div className="flex items-center justify-between">
        <button type="button" className={iconBtn} onClick={() => onSelect(addDays(selected, -7))} aria-label="Previous week">
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium" aria-live="polite">
            {weekRangeLabel(weekStart)}
          </h2>
          {!sameDay(selected, today) && (
            <button
              type="button"
              onClick={() => onSelect(today)}
              className="rounded px-1 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              Today
            </button>
          )}
        </div>
        <button type="button" className={iconBtn} onClick={() => onSelect(addDays(selected, 7))} aria-label="Next week">
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <ul className="mt-3 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isSel = sameDay(d, selected);
          const has = daysWithTasks.has(dayKey(d));
          return (
            <li key={dayKey(d)} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-pressed={isSel}
                aria-label={`${fullDate.format(d)}${sameDay(d, today) ? ", today" : ""}${has ? ", has tasks" : ""}`}
                className={`flex h-16 w-10 flex-col items-center justify-center gap-1 rounded-full text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isSel ? "bg-primary text-white" : "text-muted hover:bg-complete-bg"
                }`}
              >
                <span>{weekdayAbbr(d)}</span>
                <span className={`text-base ${isSel ? "font-semibold" : ""}`}>{d.getDate()}</span>
                <span className={`size-1 rounded-full ${has ? (isSel ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
