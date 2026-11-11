import type { ErrorRequestHandler, RequestHandler } from "express";

export type ErrorCode = "BAD_REQUEST" | "VALIDATION_ERROR" | "NOT_FOUND" | "RATE_LIMITED" | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class HttpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = () => {
  throw new HttpError("NOT_FOUND", "Route not found");
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(STATUS[err.code]).json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }
  // express.json() parse and size errors carry a 4xx status
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: err.type === "entity.too.large" ? "Body too large" : "Malformed request body" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
};
