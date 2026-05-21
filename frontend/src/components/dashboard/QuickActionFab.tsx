import type { LucideIcon } from "lucide-react";

interface QuickActionFabProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: "expense" | "income" | "transfer";
}

export function QuickActionFab({
  icon: Icon,
  label,
  onClick,
  tone,
}: QuickActionFabProps) {
  const toneClass = {
    expense: "border-[var(--color-error)]/50 bg-[var(--color-error)]/15 text-[var(--color-error)] focus-visible:outline-[var(--color-error)]",
    income: "border-emerald-500/50 bg-emerald-500/15 text-emerald-500 focus-visible:outline-emerald-500",
    transfer: "border-sky-500/50 bg-sky-500/15 text-sky-500 focus-visible:outline-sky-500",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${toneClass}`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
