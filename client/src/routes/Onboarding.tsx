import { Link } from "react-router";

// Slice 0 placeholder; the real screen lands in slice 6.
export default function Onboarding() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-6 py-8">
      <h1 className="text-2xl font-semibold">Manage What To Do</h1>
      <Link to="/" className="mt-6 inline-block bg-primary px-6 py-3 text-white">
        Get Started
      </Link>
    </main>
  );
}
