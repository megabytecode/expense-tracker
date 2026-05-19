import type { LucideIcon } from "lucide-react";

interface QuickActionFabProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "default" | "positive";
}

export function QuickActionFab({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: QuickActionFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-full border px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-0.5 ${
        tone === "positive"
          ? "border-[var(--color-secondary)] bg-[var(--color-secondary)] text-[var(--color-on-secondary)]"
          : "border-[var(--color-primary-container)] bg-[var(--color-primary-container)] text-white"
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/14">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
