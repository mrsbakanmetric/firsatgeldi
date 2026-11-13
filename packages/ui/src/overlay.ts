"use client";

// Shared overlay behaviour (pagedesign.md §4): focus moves in and is trapped,
// Escape closes, focus returns to the opener, the page behind keeps its state
// and does not scroll. Layers come only from the z-index tokens (§5.37).
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => !element.closest("[hidden],[inert]"));
}

/** True after the first client render (portals need document.body). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Calls the latest `callback` without re-running effects when it changes. */
function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Escape closes the topmost open overlay only. */
export function useEscape(active: boolean, onEscape: () => void): void {
  const latest = useLatest(onEscape);
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      latest.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, latest]);
}

/** Moves focus into `container` while active, keeps Tab inside it, and returns focus to the opener after. */
export function useFocusTrap(container: RefObject<HTMLElement | null>, active: boolean, initialFocus?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = container.current;
    if (!active || !element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (initialFocus?.current ?? focusableIn(element)[0] ?? element).focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusableIn(element);
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    element.addEventListener("keydown", onKey);
    return () => {
      element.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [active, container, initialFocus]);
}

/** Keeps the page behind from scrolling while a modal overlay is open. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, [active]);
}

/** Closes when a pointer goes down outside every given element. */
export function useOutsidePress(elements: ReadonlyArray<RefObject<HTMLElement | null>>, active: boolean, onOutside: () => void): void {
  const latest = useLatest(onOutside);
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && elements.some((ref) => ref.current?.contains(target))) return;
      latest.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active, elements, latest]);
}

export interface AnchorPosition {
  top: number;
  /** Distance from the viewport's right edge to the anchor's right edge. */
  right: number;
  left: number;
  width: number;
}

/** Viewport position of the anchor while open (for popovers rendered in a portal). */
export function useAnchorPosition(anchor: RefObject<HTMLElement | null>, open: boolean): AnchorPosition | null {
  const [position, setPosition] = useState<AnchorPosition | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom, right: window.innerWidth - rect.right, left: rect.left, width: rect.width });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchor, open]);
  return open ? position : null;
}
