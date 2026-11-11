import { Search } from "lucide-react";
import { Link } from "react-router";

// Home only links to /search; the real input lives on the Search route.
export function SearchBar() {
  return (
    <Link
      to="/search"
      className="flex h-12 items-center justify-between rounded border border-border bg-surface px-4 text-[13px] text-muted outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
    >
      Search for a task
      <Search size={20} className="text-ink" aria-hidden />
    </Link>
  );
}
