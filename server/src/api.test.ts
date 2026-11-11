import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { connectDb } from "./db";
import { Task } from "./tasks/task.model";

let mem: MongoMemoryServer;
let app: ReturnType<typeof createApp>;
const A = randomUUID();
const B = randomUUID();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await connectDb(mem.getUri("test"));
}, 120_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(async () => {
  app = createApp(); // fresh rate limit store per test
  await Task.deleteMany({});
});

const as = (id: string) => ({
  get: (p: string) => request(app).get(`/api${p}`).set("X-Client-Id", id),
  post: (p: string, b: object) => request(app).post(`/api${p}`).set("X-Client-Id", id).send(b),
  patch: (p: string, b: object) => request(app).patch(`/api${p}`).set("X-Client-Id", id).send(b),
  del: (p: string) => request(app).delete(`/api${p}`).set("X-Client-Id", id),
});
const create = (b: object, id = A) => as(id).post("/tasks", { title: "Task", startAt: "2026-11-11T09:00:00Z", ...b });

describe("validation (AC-2)", () => {
  it.each([
    ["empty title", { title: "" }, "title"],
    ["title of spaces", { title: "   " }, "title"],
    ["121 char title", { title: "x".repeat(121) }, "title"],
    ["missing startAt", { startAt: undefined }, "startAt"],
    ["endAt equal to startAt", { endAt: "2026-11-11T09:00:00Z" }, "endAt"],
    ["endAt 25 h later", { endAt: "2026-11-12T10:00:00Z" }, "endAt"],
    ["operator injection", { title: { $gt: "" } }, "title"],
  ])("POST rejects %s", async (_n, body, field) => {
    const r = await create(body);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_ERROR");
    expect(r.body.error.fields[field]).toBeTruthy();
  });

  it("PATCH checks the merged task, not just the patch", async () => {
    const t = (await create({ endAt: "2026-11-11T10:00:00Z" })).body;
    const r = await as(A).patch(`/tasks/${t.id}`, { startAt: "2026-11-11T11:00:00Z" });
    expect(r.status).toBe(400);
    expect(r.body.error.fields.endAt).toBeTruthy();
  });

  it("PATCH updates fields, clears nullables, strips unknown fields", async () => {
    const t = (await create({ priority: "high", endAt: "2026-11-11T10:00:00Z" })).body;
    const r = await as(A).patch(`/tasks/${t.id}`, { status: "completed", priority: null, endAt: null, clientId: B, title: " New " });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "completed", priority: null, endAt: null, title: "New" });
    expect((await as(A).get(`/tasks/${t.id}`)).status).toBe(200);
  });
});

describe("isolation (AC-11)", () => {
  it("another client's task is 404 for read, edit, delete", async () => {
    const t = (await create({})).body;
    expect((await as(B).get(`/tasks/${t.id}`)).status).toBe(404);
    expect((await as(B).patch(`/tasks/${t.id}`, { title: "hijack" })).status).toBe(404);
    expect((await as(B).del(`/tasks/${t.id}`)).status).toBe(404);
    expect((await as(A).get(`/tasks/${t.id}`)).body.title).toBe("Task");
  });

  it("missing header is 400, malformed id is 404, delete is 204 then 404", async () => {
    expect((await request(app).get("/api/tasks/search?q=a")).status).toBe(400);
    expect((await as(A).get("/tasks/not-an-id")).status).toBe(404);
    const t = (await create({})).body;
    expect((await as(A).del(`/tasks/${t.id}`)).status).toBe(204);
    expect((await as(A).del(`/tasks/${t.id}`)).status).toBe(404);
  });
});

describe("weeks (AC-6, AC-7)", () => {
  it("Asia/Kolkata: Sunday 23:30 and Monday 00:00 land in different weeks", async () => {
    await create({ startAt: "2026-11-15T23:30:00+05:30" });
    const done = (await create({ startAt: "2026-11-16T00:00:00+05:30" })).body;
    await as(A).patch(`/tasks/${done.id}`, { status: "completed" });
    const r = await as(A).get("/weeks?tz=Asia/Kolkata");
    expect(r.body.weeks).toEqual([
      { weekStart: "2026-11-08T18:30:00.000Z", open: 1, completed: 0, total: 1 },
      { weekStart: "2026-11-15T18:30:00.000Z", open: 0, completed: 1, total: 1 },
    ]);
  });

  it("America/New_York: the Sunday DST ends is in the week from the previous Monday", async () => {
    await create({ startAt: "2026-11-01T12:00:00-05:00" });
    const r = await as(A).get("/weeks?tz=America/New_York");
    expect(r.body.weeks).toEqual([{ weekStart: "2026-10-26T04:00:00.000Z", open: 1, completed: 0, total: 1 }]);
  });

  it("invalid tz is 400 and other clients' tasks are not counted", async () => {
    expect((await as(A).get("/weeks?tz=Mars/Base")).status).toBe(400);
    await create({}, B);
    expect((await as(A).get("/weeks?tz=UTC")).body.weeks).toEqual([]);
  });
});

describe("search (AC-5)", () => {
  it("treats the query literally and case insensitive", async () => {
    await create({ title: "a.b" });
    await create({ title: "axb" });
    await create({ title: "x", description: "finishing touches" });
    const dot = await as(A).get("/tasks/search?q=a.b");
    expect(dot.body.items.map((t: { title: string }) => t.title)).toEqual(["a.b"]);
    expect((await as(A).get("/tasks/search?q=FINISH")).body.items).toHaveLength(1);
  });

  it("pages 25 matches as 20 then 5", async () => {
    await Task.insertMany(
      Array.from({ length: 25 }, (_, i) => ({ clientId: A, title: `match ${i}`, startAt: new Date(Date.UTC(2026, 10, 1 + (i % 3))) })),
    );
    const p1 = await as(A).get("/tasks/search?q=match&limit=20");
    expect(p1.body.items).toHaveLength(20);
    expect(p1.body.nextCursor).toBeTruthy();
    const p2 = await as(A).get(`/tasks/search?q=match&limit=20&cursor=${encodeURIComponent(p1.body.nextCursor)}`);
    expect(p2.body.items).toHaveLength(5);
    expect(p2.body.nextCursor).toBeNull();
    const ids = new Set([...p1.body.items, ...p2.body.items].map((t: { id: string }) => t.id));
    expect(ids.size).toBe(25);
  });

  it("garbage cursor and empty q are 400", async () => {
    expect((await as(A).get("/tasks/search?q=a&cursor=garbage")).status).toBe(400);
    expect((await as(A).get("/tasks/search?q=%20%20")).status).toBe(400);
  });
});

describe("abuse", () => {
  it("rate limits after 120 requests a minute", async () => {
    for (let i = 0; i < 120; i++) await request(app).get("/api/health");
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe("RATE_LIMITED");
  });
});
