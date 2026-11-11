import serverless from "serverless-http";
import { createApp } from "../../server/src/app";
import { connectDb } from "../../server/src/db";

const run = serverless(createApp());

export const handler = async (event: object, context: { callbackWaitsForEmptyEventLoop: boolean }) => {
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
