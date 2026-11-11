import { Plus } from "lucide-react";

// Centred at the bottom like the Figma Home frame.
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add new task"
      className="fixed bottom-6 left-1/2 z-10 grid size-[72px] -translate-x-1/2 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <Plus size={32} aria-hidden />
    </button>
  );
}
