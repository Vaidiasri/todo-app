import { createHash } from "node:crypto";
import express, { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { dbUp } from "./db";
import { HttpError, errorHandler, notFound } from "./errors";
import { requireClientId } from "./clientId";
import { taskRoutes, weekRoutes } from "./tasks/task.routes";

// One line per request. No query string (search text), no body, client id only as a short hash.
const logRequests: RequestHandler = (req, res, next) => {
  const t0 = performance.now();
  res.on("finish", () => {
    const id = req.get("x-client-id");
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.originalUrl.split("?")[0],
        status: res.statusCode,
        ms: Math.round(performance.now() - t0),
        client: id ? createHash("sha256").update(id).digest("hex").slice(0, 12) : undefined,
      }),
    );
  });
  next();
};

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Netlify and the Vite proxy sit in front; rate limit by the real client IP
  if (process.env.NODE_ENV !== "test") app.use(logRequests);
  app.use(express.json({ limit: "10kb" }));

  const api = Router();
  // ponytail: in memory per function instance, so a soft limit (spec 0001, Consequences).
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_req, _res, next) => next(new HttpError("RATE_LIMITED", "Too many requests, try again in a minute")),
    }),
  );
  api.get("/health", (_req, res) => {
    res.json({ ok: true, db: dbUp() ? "up" : "down" });
  });
  api.use("/tasks", requireClientId, taskRoutes);
  api.use("/weeks", requireClientId, weekRoutes);
  api.use(notFound);

  // Netlify may hand the function either path shape; mount on both (see spec 0001 Follow-up).
  app.use(["/api", "/.netlify/functions/api"], api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
