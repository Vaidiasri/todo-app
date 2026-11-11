import { Router, type Request } from "express";
import { HttpError } from "../errors";
import { Task } from "./task.model";
import { createTaskSchema, mergedTimesSchema, parse, patchTaskSchema, rangeQuerySchema, searchQuerySchema, weeksQuerySchema } from "./task.schemas";
import { serialize } from "./serialize";

export const taskRoutes = Router();
export const weekRoutes = Router();

const taskNotFound = () => new HttpError("NOT_FOUND", "Task not found");

// A malformed id is a 404, same as another client's id.
function ownFilter(req: Request<{ id: string }>) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw taskNotFound();
  return { _id: req.params.id, clientId: req.clientId };
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function decodeCursor(cursor: string) {
  const [iso, id] = Buffer.from(cursor, "base64").toString("utf8").split("|");
  const startAt = new Date(iso ?? "");
  if (Number.isNaN(startAt.getTime()) || !/^[a-f\d]{24}$/i.test(id ?? "")) throw new HttpError("BAD_REQUEST", "Invalid cursor");
  return { startAt, id };
}

taskRoutes.get("/", async (req, res) => {
  const { from, to } = parse(rangeQuerySchema, req.query);
  const docs = await Task.find({ clientId: req.clientId, startAt: { $gte: from, $lt: to } })
    .sort({ startAt: 1, _id: 1 })
    .limit(500)
    .lean();
  res.json({ items: docs.map(serialize) });
});

taskRoutes.get("/search", async (req, res) => {
  const { q, limit, cursor } = parse(searchQuerySchema, req.query);
  const re = new RegExp(escapeRegex(q), "i");
  const and: object[] = [{ $or: [{ title: re }, { description: re }] }];
  if (cursor) {
    const c = decodeCursor(cursor);
    and.push({ $or: [{ startAt: { $gt: c.startAt } }, { startAt: c.startAt, _id: { $gt: c.id } }] });
  }
  const docs = await Task.find({ clientId: req.clientId, $and: and })
    .sort({ startAt: 1, _id: 1 })
    .limit(limit + 1)
    .lean();
  const page = docs.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = docs.length > limit && last ? Buffer.from(`${last.startAt.toISOString()}|${last._id}`).toString("base64") : null;
  res.json({ items: page.map(serialize), nextCursor });
});

taskRoutes.get("/:id", async (req, res) => {
  const doc = await Task.findOne(ownFilter(req)).lean();
  if (!doc) throw taskNotFound();
  res.json(serialize(doc));
});

taskRoutes.post("/", async (req, res) => {
  const body = parse(createTaskSchema, req.body ?? {});
  const doc = await Task.create({ ...body, clientId: req.clientId });
  res.status(201).json(serialize(doc.toObject()));
});

taskRoutes.patch("/:id", async (req, res) => {
  const filter = ownFilter(req);
  const patch = parse(patchTaskSchema, req.body ?? {});
  const doc = await Task.findOne(filter);
  if (!doc) throw taskNotFound();
  doc.set(patch);
  parse(mergedTimesSchema, { startAt: doc.startAt, endAt: doc.endAt ?? null });
  await doc.save();
  res.json(serialize(doc.toObject()));
});

taskRoutes.delete("/:id", async (req, res) => {
  const r = await Task.deleteOne(ownFilter(req));
  if (!r.deletedCount) throw taskNotFound();
  res.status(204).end();
});

weekRoutes.get("/", async (req, res) => {
  const { tz } = parse(weeksQuerySchema, req.query);
  const rows = await Task.aggregate<{ _id: Date; total: number; completed: number }>([
    { $match: { clientId: req.clientId } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$startAt", unit: "week", startOfWeek: "monday", timezone: tz } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({
    weeks: rows.map((w) => ({ weekStart: w._id.toISOString(), open: w.total - w.completed, completed: w.completed, total: w.total })),
  });
});
