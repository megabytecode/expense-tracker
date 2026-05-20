import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const { label, id, ...inputProps } = props;
    const inputId = id || inputProps.name || label;

    const input = (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full min-w-0 max-w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm ring-offset-[var(--color-background)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-outline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        id={inputId}
        {...inputProps}
      />
    );

    if (!label) {
      return input;
    }

    return (
      <label className="block min-w-0 space-y-1.5 text-sm font-medium text-[var(--color-on-surface)]">
        <span>{label}</span>
        {input}
      </label>
    )
  }
)
Input.displayName = "Input"

export { Input }
