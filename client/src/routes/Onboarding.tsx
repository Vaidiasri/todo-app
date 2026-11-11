import { useNavigate } from "react-router";

export const ONBOARDED_KEY = "todo.onboarded";

export default function Onboarding() {
  const navigate = useNavigate();
  const start = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // Storage blocked: nothing to persist; Home still opens.
    }
    navigate("/", { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <div className="relative h-[64dvh] min-h-64 overflow-hidden bg-primary" aria-hidden>
        <svg viewBox="0 0 120 60" className="absolute top-10 left-6 w-28 text-white/40" fill="none" stroke="currentColor" strokeWidth="4">
          <path d="M4 40 20 20l16 20 16-20 16 20 16-20 16 20 16-20" />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute -top-12 -right-12 w-44 text-white/25" fill="none" stroke="currentColor" strokeWidth="10">
          <circle cx="50" cy="50" r="40" />
        </svg>
        <svg viewBox="0 0 120 60" className="absolute right-6 bottom-10 w-28 text-white/40" fill="none" stroke="currentColor" strokeWidth="4">
          <path d="M4 40 20 20l16 20 16-20 16 20 16-20 16 20 16-20" />
        </svg>
      </div>
      <div className="flex flex-1 flex-col px-6 pt-8 pb-10">
        <h1 className="text-2xl font-semibold">Manage What To Do</h1>
        <p className="mt-3 text-[13px] text-muted">The best way to manage what you have to do, don't forget your plans</p>
        <button
          type="button"
          onClick={start}
          className="mt-auto h-12 w-full rounded bg-primary text-[15px] font-medium text-white hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Get Started
        </button>
      </div>
    </main>
  );
}
