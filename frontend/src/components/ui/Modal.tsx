import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"
import { Button } from "./Button"

let activeModalCount = 0;
let previousBodyOverflow = "";
let previousBodyTouchAction = "";
let previousBodyOverscrollBehavior = "";
let previousHtmlOverflow = "";
let previousHtmlOverscrollBehavior = "";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const titleId = React.useId();

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (activeModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousBodyTouchAction = document.body.style.touchAction;
      previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    }

    activeModalCount += 1;

    return () => {
      activeModalCount -= 1;

      if (activeModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.touchAction = previousBodyTouchAction;
        document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 [overscroll-behavior:none] sm:items-center sm:p-4">
      <div 
        className={cn("h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] shadow-[0_8px_30px_rgba(15,23,42,0.16)] sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-md sm:rounded-lg", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-outline-variant)]">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--color-on-surface)]">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-[calc(100dvh-65px)] overflow-y-auto p-4 [overscroll-behavior:contain] sm:h-auto sm:max-h-[calc(92vh-65px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
