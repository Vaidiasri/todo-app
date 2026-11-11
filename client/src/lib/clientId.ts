const KEY = "todo.clientId";
let memory: string | undefined;

/** Anonymous per browser id that scopes this visitor's tasks. Falls back to memory if storage throws. */
export function getClientId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return (memory ??= crypto.randomUUID());
  }
}
