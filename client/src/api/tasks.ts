import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  priority: Priority | null;
  status: "in_progress" | "completed";
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

export function useRangeTasks(from: Date, to: Date) {
  const f = from.toISOString();
  const t = to.toISOString();
  return useQuery({
    queryKey: ["tasks", "range", f, t],
    queryFn: () => api<{ items: Task[] }>(`/tasks?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`),
    select: (d) => d.items,
    placeholderData: keepPreviousData,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => api<Task>("/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["weeks"] });
    },
  });
}
