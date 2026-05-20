import type { LucideIcon } from "lucide-react";

interface QuickActionFabProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
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
      aria-label={label}
      title={label}
      className={`group flex h-14 w-14 items-center justify-center rounded-full border shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-error)] ${
        tone === "danger"
          ? "border-[var(--color-error)]/50 bg-[var(--color-error-container)] text-[var(--color-error)]"
          : "border-[var(--color-error)]/30 bg-[var(--color-surface-container-lowest)] text-[var(--color-error)]"
      }`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
