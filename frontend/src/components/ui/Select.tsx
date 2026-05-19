import * as React from "react"
import { cn } from "../../lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    const { label, id, ...selectProps } = props;
    const selectId = id || selectProps.name || label;

    const select = (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm ring-offset-[var(--color-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        id={selectId}
        {...selectProps}
      />
    );

    if (!label) {
      return select;
    }

    return (
      <label className="block space-y-1.5 text-sm font-medium text-[var(--color-on-surface)]">
        <span>{label}</span>
        {select}
      </label>
    )
  }
)
Select.displayName = "Select"

export { Select }
