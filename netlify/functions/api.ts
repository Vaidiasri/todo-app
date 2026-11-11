import serverless from "serverless-http";
import { createApp } from "../../server/src/app";
import { connectDb } from "../../server/src/db";

const run = serverless(createApp());

type Event = { headers: Record<string, string | undefined>; requestContext?: object };

export const handler = async (event: Event, context: { callbackWaitsForEmptyEventLoop: boolean }) => {
  // Netlify sends no requestContext, so serverless-http leaves req.ip undefined and the rate limiter throws.
  event.requestContext ??= { identity: { sourceIp: event.headers["x-nf-client-connection-ip"] ?? "0.0.0.0" } };
  // Let the function return while the pooled Mongo socket stays open for the next warm call.
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDb();
  } catch (err) {
    // Health still answers (db: "down"); data routes fail fast because bufferCommands is off.
    console.error("db connect failed", err);
  }
  return run(event, context);
};
