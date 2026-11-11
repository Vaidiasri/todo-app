import type { TaskDoc } from "./task.model";

// clientId is never returned.
export const serialize = (t: TaskDoc) => ({
  id: String(t._id),
  title: t.title,
  description: t.description,
  startAt: t.startAt.toISOString(),
  endAt: t.endAt ? t.endAt.toISOString() : null,
  priority: t.priority ?? null,
  status: t.status,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});
