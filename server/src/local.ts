import { createApp } from "./app";
import { connectDb } from "./db";

try {
  process.loadEnvFile(); // server/.env, optional
} catch {
  // no .env file: fall through to defaults
}

let uri = process.env.MONGODB_URI;
if (!uri) {
  // ponytail: local dev without Atlas or Docker uses a throwaway in memory MongoDB; set MONGODB_URI to keep data.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  uri = mem.getUri("todo");
  console.log("MONGODB_URI not set, using in memory MongoDB (data is lost on restart)");
}

await connectDb(uri);
const port = Number(process.env.PORT) || 4000;
createApp().listen(port, () => console.log(`API on http://localhost:${port}`));
