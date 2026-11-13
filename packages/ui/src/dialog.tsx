"use client";

// Dialog (product_design_pattern.md §5.28): centred window over a dimmed page;
// width size.modal-width with an optional right panel (size.modal-aside-width,
// surface-alt). Header: icon tile + title + one-line description (+ steps).
// Close: 40 px round bordered button. Below breakpoint.md a full-height bottom
// sheet. Never used for limit-reached messages (§6).
import { X, type LucideIcon } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useEscape, useFocusTrap, useMounted, useScrollLock } from "./overlay";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Accessible name of the close button ("Kapat"). */
  closeLabel: string;
  /** Step indicator when the dialog has steps (§5.24). */
  steps?: ReactNode;
  /** Right panel: the selected item and the primary action. */
  aside?: ReactNode;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, description, icon, closeLabel, steps, aside, children }: DialogProps) {
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
      <div className="pointer-events-none fixed inset-0 z-(--z-index-modal) flex items-end md:items-center md:justify-center md:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={description ? `${id}-description` : undefined}
          tabIndex={-1}
          className={cn(
            "pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-surface shadow-lg outline-none",
            "rounded-t-xl md:h-auto md:max-h-full md:max-w-(--size-modal-width) md:rounded-xl",
          )}
        >
          <div className="flex items-start gap-4 border-b border-divider p-6">
            {icon && (
              <span className="flex size-(--size-thumb-sm) shrink-0 items-center justify-center rounded-md bg-primary-subtle text-on-primary-subtle">
                <Icon icon={icon} size="lg" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 id={`${id}-title`} className="text-h2 text-text">
                {title}
              </h2>
              {description && (
                <p id={`${id}-description`} className="text-body-sm text-text-muted">
                  {description}
                </p>
              )}
              {steps && <div className="pt-3">{steps}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-text hover:bg-surface-alt", focusRing)}
            >
              <Icon icon={X} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
            {aside && (
              <aside className="flex flex-col gap-4 overflow-y-auto border-t border-divider bg-surface-alt p-6 md:w-(--size-modal-aside-width) md:shrink-0 md:border-t-0 md:border-l">
                {aside}
              </aside>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
