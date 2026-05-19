import * as React from "react"
import { cn } from "../../lib/utils"
import { AlertTriangle, FolderOpen, Loader2 } from "lucide-react"

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-4 py-10 text-center", className)}>
      <div className="mb-4 rounded-full bg-[var(--color-surface-container)] p-4">
        {icon || <FolderOpen className="h-8 w-8 text-[var(--color-on-surface-variant)]" />}
      </div>
      <h3 className="text-lg font-medium text-[var(--color-on-surface)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)] max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function LoadingState({
  title = "Cargando información...",
  description = "Estamos preparando los datos financieros.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-48 flex-col items-center justify-center rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-4 py-10 text-center", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-secondary)]" aria-hidden="true" />
      <p className="mt-4 font-medium text-[var(--color-on-surface)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-on-surface-variant)]">{description}</p>
    </div>
  );
}

export function ErrorState({
  title = "No pudimos cargar esta información.",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error-container)] px-4 py-10 text-center text-[var(--color-on-error-container)]", className)}>
      <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      <p className="mt-4 font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
