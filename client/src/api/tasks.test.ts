import { describe, expect, it } from "vitest";
import { patchCached, type Task } from "./tasks";

const task = (id: string, status: Task["status"] = "in_progress") => ({ id, status }) as Task;
const done = (t: Task): Task => ({ ...t, status: "completed" });

describe("patchCached", () => {
  it("patches a range list and leaves other tasks alone", () => {
    const out = patchCached({ items: [task("a"), task("b")] }, "b", done) as { items: Task[] };
    expect(out.items.map((t) => t.status)).toEqual(["in_progress", "completed"]);
  });

  it("patches every page of a search result", () => {
    const out = patchCached({ pages: [{ items: [task("a")] }, { items: [task("b")] }], pageParams: [] }, "b", done) as {
      pages: { items: Task[] }[];
    };
    expect(out.pages[1].items[0].status).toBe("completed");
    expect(out.pages[0].items[0].status).toBe("in_progress");
  });

  it("patches a single cached task only when the id matches", () => {
    expect((patchCached(task("a"), "a", done) as Task).status).toBe("completed");
    expect((patchCached(task("a"), "x", done) as Task).status).toBe("in_progress");
  });

  it("returns empty cache entries untouched", () => {
    expect(patchCached(undefined, "a", done)).toBeUndefined();
  });
});
