import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-outline)] disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-[var(--color-primary-container)]/90":
              variant === "default",
            "border border-[var(--color-outline-variant)] bg-transparent hover:bg-[var(--color-surface-dim)] text-[var(--color-on-surface)]":
              variant === "outline",
            "hover:bg-[var(--color-surface-dim)] text-[var(--color-on-surface)]":
              variant === "ghost",
            "bg-[var(--color-error)] text-[var(--color-on-error)] hover:bg-[var(--color-error)]/90":
              variant === "danger",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
