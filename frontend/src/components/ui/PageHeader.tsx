import * as React from "react"
import { cn } from "../../lib/utils"

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-outline-variant)]", className)}>
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-on-surface)] tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
