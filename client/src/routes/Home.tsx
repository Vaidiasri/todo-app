import { useEffect, useState } from "react";
import { Link } from "react-router";

// Slice 0 placeholder: proves the client reaches the API and the API reaches the database.
export default function Home() {
  const [api, setApi] = useState("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((b: { db: string }) => setApi(`db ${b.db}`))
      .catch(() => setApi("unreachable"));
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-6 py-8">
      <h1 className="text-lg font-semibold">Home</h1>
      <p className="mt-2 text-sm text-muted">
        API: <span data-testid="api-status">{api}</span>
      </p>
      <nav className="mt-6 flex gap-4 text-sm text-primary">
        <Link to="/welcome">Welcome</Link>
        <Link to="/search">Search</Link>
      </nav>
    </main>
  );
}
