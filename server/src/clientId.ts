import type { RequestHandler } from "express";
import { HttpError } from "./errors";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare global {
  namespace Express {
    interface Request {
      clientId: string;
    }
  }
}

// Scopes data per anonymous visitor. Not authentication (spec 0001, Security model).
export const requireClientId: RequestHandler = (req, _res, next) => {
  const id = req.get("x-client-id");
  if (!id || !UUID_V4.test(id)) throw new HttpError("BAD_REQUEST", "Missing or invalid X-Client-Id header");
  req.clientId = id.toLowerCase();
  next();
};
