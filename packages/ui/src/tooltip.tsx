"use client";

// Tooltip (product_design_pattern.md §5.36): supplementary text only, shown on
// mouse hover and keyboard focus after a short delay, never on touch. Anything
// the user needs to act or decide is never placed only in a tooltip.
import { tokens } from "@firsatgeldi/tokens";
import { cloneElement, useEffect, useId, useRef, useState, type FocusEvent, type ReactElement } from "react";
import { cn } from "./cn";

const DELAY_MS = Number.parseFloat(tokens.components.tooltip.delay);

export interface TooltipProps {
  text: string;
  /** The element the tooltip describes (one focusable element). */
  children: ReactElement<{ "aria-describedby"?: string }>;
  /**
   * true when the text repeats the child's accessible name (icon-only buttons):
   * the tooltip is then hidden from assistive technology to avoid reading it twice.
   */
  duplicatesLabel?: boolean;
  placement?: "top" | "bottom";
}

export function Tooltip({ text, children, duplicatesLabel = false, placement = "bottom" }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = () => clearTimeout(timer.current);
  const show = () => {
    clear();
    timer.current = setTimeout(() => setOpen(true), DELAY_MS);
  };
  const hide = () => {
    clear();
    setOpen(false);
  };

  useEffect(() => clear, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onFocus = (event: FocusEvent<HTMLSpanElement>) => {
    // Keyboard focus only; a tap or click does not open it.
    if (event.target instanceof Element && event.target.matches(":focus-visible")) show();
  };

  const trigger = duplicatesLabel ? children : cloneElement(children, { "aria-describedby": id });

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(event) => event.pointerType === "mouse" && show()}
      onPointerLeave={hide}
      onFocus={onFocus}
      onBlur={hide}
    >
      {trigger}
      <span
        id={id}
        role={duplicatesLabel ? undefined : "tooltip"}
        aria-hidden={duplicatesLabel || undefined}
        className={cn(
          "pointer-events-none absolute left-1/2 z-(--z-index-tooltip) w-max max-w-(--component-tooltip-max-width) -translate-x-1/2",
          "rounded-sm bg-text px-2 py-1 text-caption text-text-inverse",
          placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
          !open && "hidden",
        )}
      >
        {text}
      </span>
    </span>
  );
}
