"use client";

// Surface shared by Menu and Select lists (product_design_pattern.md §5.36):
// from breakpoint.md a dropdown under its button; below it a bottom sheet
// over a dimmed page (§5.25). Layer: z-index.popover (§5.37), above dialogs.
import { forwardRef, type CSSProperties, type HTMLAttributes, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { useAnchorPosition, useMounted } from "./overlay";

export interface PopoverSurfaceProps extends HTMLAttributes<HTMLElement> {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  /** Which edge of the button the dropdown lines up with. */
  align?: "start" | "end";
  /** Dropdown at least as wide as its button (Select). */
  matchWidth?: boolean;
  as?: "div" | "ul";
}

export const PopoverSurface = forwardRef<HTMLElement, PopoverSurfaceProps>(function PopoverSurface(
  { open, anchor, align = "end", matchWidth = false, as = "div", className, style, children, ...rest },
  ref,
) {
  const mounted = useMounted();
  const position = useAnchorPosition(anchor, open);
  if (!mounted || !open) return null;

  // Runtime measurements of the button, not design values.
  const anchorStyle = {
    "--anchor-top": `${position?.top ?? 0}px`,
    "--anchor-left": `${position?.left ?? 0}px`,
    "--anchor-right": `${position?.right ?? 0}px`,
    "--anchor-width": `${position?.width ?? 0}px`,
    ...style,
  } as CSSProperties;

  const Element = as;
  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-0 z-(--z-index-popover) bg-overlay md:hidden" />
      <Element
        ref={ref as never}
        style={anchorStyle}
        className={cn(
          "fixed z-(--z-index-popover) flex flex-col gap-0 overflow-y-auto border border-border bg-surface p-1",
          "inset-x-0 bottom-0 max-h-full rounded-t-xl pb-4 shadow-lg",
          "md:inset-x-auto md:bottom-auto md:mt-2 md:min-w-(--component-menu-min-width) md:rounded-lg md:pb-1 md:shadow-md",
          "md:top-(--anchor-top)",
          align === "end" ? "md:right-(--anchor-right)" : "md:left-(--anchor-left)",
          matchWidth && "md:min-w-(--anchor-width)",
          className,
        )}
        {...rest}
      >
        {children}
      </Element>
    </>,
    document.body,
  );
});
