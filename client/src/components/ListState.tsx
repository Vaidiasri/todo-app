import type { ReactNode } from "react";

type Query = { isPending: boolean; isError: boolean; data?: unknown; refetch: () => unknown };

/** Shared loading skeleton, inline error with Retry, and empty state (AC-14). Renders children otherwise. */
export function ListState({ query, empty, isEmpty, children }: { query: Query; empty: ReactNode; isEmpty?: boolean; children: ReactNode }) {
  if (query.isPending)
    return (
      <ul aria-label="Loading" className="mt-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="my-4 h-10 animate-pulse rounded bg-divider" />
        ))}
      </ul>
    );
  if (query.isError && !query.data)
    return (
      <div role="alert" className="mt-4 text-sm text-danger">
        Could not load tasks.{" "}
        <button type="button" onClick={() => query.refetch()} className="font-medium text-primary underline">
          Retry
        </button>
      </div>
    );
  const none = isEmpty ?? (Array.isArray(query.data) && query.data.length === 0);
  if (none) return <p className="mt-4 text-sm text-muted">{empty}</p>;
  return <>{children}</>;
}
