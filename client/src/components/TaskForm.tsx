import { CalendarDays, Clock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import { useCreateTask, type Priority, type Task } from "../api/tasks";
import { combineDateTime, longDateLabel, parseDayKey } from "../lib/week";
import { toast } from "./Toaster";

type Field = "title" | "date" | "startAt" | "endAt" | "description";
type Errors = Partial<Record<Field, string>>;

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const box = "h-12 w-full rounded border bg-surface text-sm outline-none focus:border-primary";
const borderFor = (err?: string) => (err ? "border-danger" : "border-border");
const hidePickerIcon = "[&::-webkit-calendar-picker-indicator]:hidden";

function openPicker(el: HTMLInputElement) {
  try {
    el.showPicker();
  } catch {
    // Unsupported or not allowed; typing still works.
  }
}

// Mirrors the server rules in server/src/tasks/task.schemas.ts.
function validate(v: { title: string; date: string; start: string; end: string }): Errors {
  const e: Errors = {};
  const title = v.title.trim();
  if (!title) e.title = "Enter a task title";
  else if (title.length > 120) e.title = "Keep the title to 120 characters";
  if (!parseDayKey(v.date)) e.date = "Pick a date";
  if (!v.start) e.startAt = "Pick a start time";
  if (v.start && v.end && v.end <= v.start) e.endAt = "End time must be later than start time";
  return e;
}

export function TaskForm({ defaultDate, onCreated }: { defaultDate: string; onCreated: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [priority, setPriority] = useState<Priority | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const create = useCreateTask();

  const clear = (f: Field) => errors[f] && setErrors((e) => ({ ...e, [f]: undefined }));

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (create.isPending) return;
    const e = validate({ title, date, start, end });
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        startAt: combineDateTime(date, start).toISOString(),
        endAt: end ? combineDateTime(date, end).toISOString() : null,
        priority,
      },
      {
        onSuccess: onCreated,
        onError: (err) => {
          if (err instanceof ApiError && err.fields) setErrors(err.fields as Errors);
          else toast(err.message || "Could not create the task");
        },
      },
    );
  }

  const dateObj = parseDayKey(date);

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-4">
        <Row label="Task title" htmlFor="f-title" error={errors.title}>
          <input
            id="f-title"
            value={title}
            maxLength={200}
            placeholder="Doing Homework"
            onChange={(e) => (setTitle(e.target.value), clear("title"))}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "f-title-err" : undefined}
            className={`${box} ${borderFor(errors.title)} px-3 placeholder:text-icon`}
          />
        </Row>

        <fieldset>
          <legend className="mb-2 text-[13px] text-muted">Set Time</legend>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["startAt", "Start", start, setStart],
                ["endAt", "Ends", end, setEnd],
              ] as const
            ).map(([f, label, value, set]) => (
              <div key={f}>
                <div className="relative">
                  <Clock size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
                  <input
                    id={`f-${f}`}
                    type="time"
                    value={value}
                    aria-label={f === "startAt" ? "Start time" : "End time (optional)"}
                    aria-invalid={!!errors[f]}
                    aria-describedby={errors[f] ? `f-${f}-err` : undefined}
                    onClick={(e) => openPicker(e.currentTarget)}
                    onChange={(e) => (set(e.target.value), clear(f), clear("endAt"))}
                    className={`peer ${box} ${borderFor(errors[f])} pr-2 pl-9 ${hidePickerIcon} ${value ? "" : "text-transparent focus:text-ink"}`}
                  />
                  {!value && (
                    <span className="pointer-events-none absolute top-1/2 left-9 -translate-y-1/2 text-sm peer-focus:hidden">
                      {label}
                    </span>
                  )}
                </div>
                <FieldError id={`f-${f}-err`} text={errors[f]} />
              </div>
            ))}
          </div>
        </fieldset>

        <Row label="Set Date" htmlFor="f-date" error={errors.date}>
          <div className="relative">
            <input
              id="f-date"
              type="date"
              value={date}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? "f-date-err" : undefined}
              onClick={(e) => openPicker(e.currentTarget)}
              onChange={(e) => (setDate(e.target.value), clear("date"))}
              className={`peer ${box} ${borderFor(errors.date)} pr-10 pl-3 text-transparent focus:text-ink ${hidePickerIcon}`}
            />
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm peer-focus:hidden">
              {dateObj ? longDateLabel(dateObj) : <span className="text-icon">Pick a date</span>}
            </span>
            <CalendarDays size={18} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
          </div>
        </Row>

        <div>
          <p id="f-priority" className="mb-2 text-[13px] text-muted">
            Priority <span className="text-icon">(optional)</span>
          </p>
          <div role="group" aria-labelledby="f-priority" className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={priority === p}
                onClick={() => setPriority(priority === p ? null : p)}
                className={`h-10 rounded border text-sm capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  priority === p ? "border-primary bg-primary text-white" : "border-border bg-surface text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Row label="Description" htmlFor="f-description" error={errors.description}>
          <textarea
            id="f-description"
            value={description}
            maxLength={1000}
            placeholder="Add Description"
            onChange={(e) => (setDescription(e.target.value), clear("description"))}
            className={`${box} ${borderFor(errors.description)} h-24 resize-none px-3 py-3 placeholder:text-ink`}
          />
        </Row>
      </div>

      <div className="border-t border-divider bg-surface px-6 pt-3 pb-6">
        <button
          type="submit"
          disabled={create.isPending}
          className="h-12 w-full rounded bg-primary text-[15px] font-medium text-white hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {create.isPending ? "Creating task..." : "Create task"}
        </button>
      </div>
    </form>
  );
}

function Row({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[13px] text-muted">
        {label}
      </label>
      {children}
      <FieldError id={`${htmlFor}-err`} text={error} />
    </div>
  );
}

const FieldError = ({ id, text }: { id: string; text?: string }) =>
  text ? (
    <p id={id} className="mt-1 text-xs text-danger">
      {text}
    </p>
  ) : null;
