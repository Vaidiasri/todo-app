import { Router } from "express";
import { Task } from "./task.model";
import { createTaskSchema, parse, rangeQuerySchema } from "./task.schemas";
import { serialize } from "./serialize";

export const taskRoutes = Router();

taskRoutes.get("/", async (req, res) => {
  const { from, to } = parse(rangeQuerySchema, req.query);
  const docs = await Task.find({ clientId: req.clientId, startAt: { $gte: from, $lt: to } })
    .sort({ startAt: 1, _id: 1 })
    .limit(500)
    .lean();
  res.json({ items: docs.map(serialize) });
});

taskRoutes.post("/", async (req, res) => {
  const body = parse(createTaskSchema, req.body ?? {});
  const doc = await Task.create({ ...body, clientId: req.clientId });
  res.status(201).json(serialize(doc.toObject()));
});
