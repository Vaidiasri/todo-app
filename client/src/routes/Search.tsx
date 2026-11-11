import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useSearchTasks } from "../api/tasks";
import { Fab } from "../components/Fab";
import { ListState } from "../components/ListState";
import { TaskRow } from "../components/TaskRow";
import { TaskSheet, useSheet } from "../components/TaskSheet";

export default function Search() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const { openNew } = useSheet();

  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const search = useSearchTasks(q);
  const items = search.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-6 pt-6 pb-32">
      <div className="flex items-center gap-2">
        <Link to="/" aria-label="Back to home" className="-ml-2 grid size-10 shrink-0 place-items-center rounded focus-visible:outline-2 focus-visible:outline-primary">
          <ArrowLeft size={22} aria-hidden />
        </Link>
        <div className="relative flex-1">
          <SearchIcon size={18} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon" />
          <input
            type="search"
            autoFocus
            value={text}
            maxLength={100}
            aria-label="Search tasks"
            placeholder="Search for a task"
            onChange={(e) => setText(e.target.value)}
            className="h-12 w-full rounded border border-border bg-surface pr-3 pl-10 text-sm outline-none placeholder:text-muted focus:border-primary"
          />
        </div>
      </div>

      <section aria-label="Results" className="mt-4">
        {!q ? (
          <p className="mt-4 text-sm text-muted">Type to search titles and descriptions.</p>
        ) : (
          <ListState query={search} isEmpty={!search.isPending && items.length === 0} empty={`No tasks match "${q}".`}>
            <ul>
              {items.map((t) => (
                <TaskRow key={t.id} task={t} showDate />
              ))}
            </ul>
            {search.hasNextPage && (
              <button
                type="button"
                disabled={search.isFetchingNextPage}
                onClick={() => search.fetchNextPage()}
                className="mt-4 h-11 w-full rounded border border-border text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
              >
                {search.isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            )}
          </ListState>
        )}
      </section>

      <Fab onClick={() => openNew(new Date())} />
      <TaskSheet />
    </main>
  );
}
