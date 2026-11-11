import express, { Router } from "express";
import { dbUp } from "./db";
import { errorHandler, notFound } from "./errors";
import { requireClientId } from "./clientId";
import { taskRoutes } from "./tasks/task.routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ ok: true, db: dbUp() ? "up" : "down" });
  });
  api.use("/tasks", requireClientId, taskRoutes);
  api.use(notFound);

  // Netlify may hand the function either path shape; mount on both (see spec 0001 Follow-up).
  app.use(["/api", "/.netlify/functions/api"], api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
