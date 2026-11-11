import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

// Cached on globalThis so warm function invocations (and tsx watch reloads) reuse one connection.
const g = globalThis as typeof globalThis & { __mongo?: Promise<typeof mongoose> };

export function connectDb(uri = process.env.MONGODB_URI): Promise<typeof mongoose> {
  if (!uri) return Promise.reject(new Error("MONGODB_URI is not set"));
  g.__mongo ??= mongoose
    .connect(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 })
    .catch((err) => {
      g.__mongo = undefined; // allow a retry on the next request
      throw err;
    });
  return g.__mongo;
}

export const dbUp = () => mongoose.connection.readyState === 1;
