import { z } from "zod";
import { HttpError } from "../errors";

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDate = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

const fields = {
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be at most 120 characters"),
  description: z.string().trim().max(1000, "Description must be at most 1000 characters"),
  startAt: isoDate,
  endAt: isoDate.nullable(),
  priority: z.enum(["low", "medium", "high"]).nullable(),
  status: z.enum(["in_progress", "completed"]),
};

export const createTaskSchema = z
  .object({
    title: fields.title,
    description: fields.description.default(""),
    startAt: fields.startAt,
    endAt: fields.endAt.default(null),
    priority: fields.priority.default(null),
  })
  .superRefine((t, ctx) => endAtIssue(t.startAt, t.endAt, ctx));

export const patchTaskSchema = z.object(fields).partial();

// PATCH checks the stored values merged with the patch.
export const mergedTimesSchema = z
  .object({ startAt: z.date(), endAt: z.date().nullable() })
  .superRefine((t, ctx) => endAtIssue(t.startAt, t.endAt, ctx));

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Enter a search term").max(100, "Search must be at most 100 characters"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const weeksQuerySchema = z.object({
  tz: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone"),
});

export function endAtIssue(startAt: Date, endAt: Date | null, ctx: z.RefinementCtx) {
  if (!endAt) return;
  const diff = endAt.getTime() - startAt.getTime();
  if (diff <= 0) ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be later than start time" });
  else if (diff >= DAY_MS) ctx.addIssue({ code: "custom", path: ["endAt"], message: "Task must end within 24 hours of its start" });
}

export const rangeQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .superRefine(({ from, to }, ctx) => {
    if (to <= from) ctx.addIssue({ code: "custom", path: ["to"], message: "'to' must be later than 'from'" });
    else if (to.getTime() - from.getTime() > 42 * DAY_MS) ctx.addIssue({ code: "custom", path: ["to"], message: "Range must be at most 42 days" });
  });

// Parse or throw 400 VALIDATION_ERROR with a { field: message } map.
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
  throw new HttpError("VALIDATION_ERROR", "Invalid input", fields);
}
