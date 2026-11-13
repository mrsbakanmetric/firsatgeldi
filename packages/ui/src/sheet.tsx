"use client";

// Sheet (product_design_pattern.md §5.25): one component, two forms — below
// breakpoint.md a bottom sheet, from breakpoint.md a side panel of
// size.side-panel-width, full height under the header. Always a visible close
// control; focus kept inside; Escape closes; the page behind keeps its state.
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useEscape, useFocusTrap, useMounted, useScrollLock } from "./overlay";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Accessible name of the close button ("Paneli kapat"). */
  closeLabel: string;
  children: ReactNode;
  /** Actions pinned to the bottom of the panel. */
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, closeLabel, children, footer }: SheetProps) {
  const mounted = useMounted();
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEscape(open, onClose);
  // Focus starts on the panel itself, so its title is read first.
  useFocusTrap(panelRef, open && mounted, panelRef);
  useScrollLock(open);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-0 z-(--z-index-overlay) bg-overlay" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className={cn(
          "fixed z-(--z-index-modal) flex flex-col bg-surface outline-none",
          "inset-x-0 bottom-0 max-h-full rounded-t-xl border border-b-0 border-border shadow-lg",
          "md:inset-x-auto md:top-(--size-header-height) md:right-0 md:w-(--size-side-panel-width) md:max-h-none md:rounded-none md:border-y-0 md:border-r-0 md:shadow-md",
        )}
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border md:hidden" />
        <div className="flex items-center justify-between gap-2 border-b border-divider py-3 pr-3 pl-4">
          <h2 id={`${id}-title`} className="text-body font-semibold text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={cn("flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill text-text hover:bg-surface-alt", focusRing)}
          >
            <Icon icon={X} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex flex-col gap-3 border-t border-divider p-4">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}
