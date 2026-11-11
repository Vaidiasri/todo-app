import { Link } from "react-router";

// Slice 0 placeholder; the real screen lands in slice 5.
export default function Search() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-6 py-8">
      <Link to="/" className="text-sm text-primary">
        Back
      </Link>
      <h1 className="mt-4 text-lg font-semibold">Search</h1>
    </main>
  );
}
