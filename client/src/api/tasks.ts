import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "../components/Toaster";
import { startOfWeek } from "../lib/week";
import { api, ApiError } from "./client";

export type Priority = "low" | "medium" | "high";
export type Status = "in_progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  priority: Priority | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  priority: Priority | null;
}

export interface Week {
  weekStart: string;
  open: number;
  completed: number;
  total: number;
}

type SearchPage = { items: Task[]; nextCursor: string | null };

const invalidate = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: ["tasks"] });
  qc.invalidateQueries({ queryKey: ["weeks"] });
};

/** Apply fn to task `id` in any cached shape under ["tasks"]: a range {items}, a search {pages}, or one Task. */
export function patchCached(old: unknown, id: string, fn: (t: Task) => Task): unknown {
  if (!old || typeof old !== "object") return old;
  if ("pages" in old) return { ...old, pages: (old.pages as unknown[]).map((p) => patchCached(p, id, fn)) };
  if ("items" in old) return { ...old, items: (old.items as Task[]).map((t) => (t.id === id ? fn(t) : t)) };
  return (old as Task).id === id ? fn(old as Task) : old;
}

function findCached(qc: QueryClient, id: string): Task | undefined {
  let found: Task | undefined;
  for (const [, data] of qc.getQueriesData({ queryKey: ["tasks"] })) patchCached(data, id, (t) => (found = t));
  return found;
}

export function useRangeTasks(from: Date, to: Date, enabled = true) {
  const f = from.toISOString();
  const t = to.toISOString();
  return useQuery({
    queryKey: ["tasks", "range", f, t],
    queryFn: () => api<{ items: Task[] }>(`/tasks?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`),
    select: (d) => d.items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTask(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["tasks", "one", id],
    queryFn: () => api<Task>(`/tasks/${id}`),
    placeholderData: () => (id ? findCached(qc, id) : undefined), // opens instantly from a list
    enabled: !!id,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1,
  });
}

export function useSearchTasks(q: string) {
  return useInfiniteQuery({
    queryKey: ["tasks", "search", q],
    queryFn: ({ pageParam }) =>
      api<SearchPage>(`/tasks/search?q=${encodeURIComponent(q)}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: q.length > 0,
  });
}

const deviceTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export function useWeeks() {
  const tz = deviceTz();
  return useQuery({
    queryKey: ["weeks", tz],
    queryFn: () =>
      api<{ weeks: Week[] }>(`/weeks?tz=${encodeURIComponent(tz)}`).catch((e) => {
        if (e instanceof ApiError && e.status === 400) return api<{ weeks: Week[] }>("/weeks?tz=UTC");
        throw e;
      }),
    select: (d) => d.weeks,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => api<Task>("/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) =>
      api<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Task deleted");
      invalidate(qc);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 404) {
        toast("That task was already deleted");
        invalidate(qc);
      } else toast("Could not delete the task. Try again.");
    },
  });
}

/** Optimistic: flips the status in every cached list and the week counts, reverts on error. */
export function useToggleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: Task) =>
      api<Task>(`/tasks/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: t.status === "completed" ? "in_progress" : "completed" }),
      }),
    onMutate: async (t) => {
      await Promise.all([qc.cancelQueries({ queryKey: ["tasks"] }), qc.cancelQueries({ queryKey: ["weeks"] })]);
      const snapshot = [...qc.getQueriesData({ queryKey: ["tasks"] }), ...qc.getQueriesData({ queryKey: ["weeks"] })];
      const status: Status = t.status === "completed" ? "in_progress" : "completed";
      const d = status === "completed" ? 1 : -1;
      const ws = startOfWeek(new Date(t.startAt)).getTime();
      qc.setQueriesData({ queryKey: ["tasks"] }, (old) => patchCached(old, t.id, (x) => ({ ...x, status })));
      qc.setQueriesData<{ weeks: Week[] }>({ queryKey: ["weeks"] }, (old) =>
        old && {
          weeks: old.weeks.map((w) =>
            new Date(w.weekStart).getTime() === ws ? { ...w, completed: w.completed + d, open: w.open - d } : w,
          ),
        },
      );
      return { snapshot };
    },
    onError: (e, _t, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast(e instanceof ApiError && e.status === 404 ? "That task was deleted" : "Could not update the task. Try again.");
    },
    onSettled: () => invalidate(qc),
  });
}
