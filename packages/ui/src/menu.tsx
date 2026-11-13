"use client";

// Menu (product_design_pattern.md §5.36): a list of actions opened from a
// button (profile menu, row "more" actions). Items 44 px with icon + label;
// arrow keys move, Enter selects, Escape closes and returns focus to the
// opener. Below breakpoint.md it opens as a bottom sheet.
import type { LucideIcon } from "lucide-react";
import { cloneElement, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement, type Ref } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";
import { useLinkComponent } from "./link";
import { useEscape, useOutsidePress } from "./overlay";
import { PopoverSurface } from "./popover";

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Navigates; otherwise `onSelect` runs. */
  href?: string;
  onSelect?: () => void;
  /** Destructive: danger text; the action itself still asks for confirmation (§4.2). */
  danger?: boolean;
  /** The page this entry leads to is open (aria-current="page"). */
  current?: boolean;
}

interface TriggerProps {
  ref?: Ref<HTMLButtonElement>;
  "aria-haspopup"?: "menu";
  "aria-expanded"?: boolean;
  "aria-controls"?: string | undefined;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export interface MenuProps {
  /** The opening button (receives ref, aria and handlers). */
  trigger: ReactElement<TriggerProps>;
  items: readonly MenuItem[];
  /** Accessible name of the list (e.g. "Profil menüsü"). */
  label: string;
  align?: "start" | "end";
}

const ITEM_CLASSES =
  "flex min-h-(--size-touch-target-min) w-full items-center gap-3 rounded-md px-3 text-left text-body text-text outline-none hover:bg-surface-alt focus-visible:bg-surface-alt";

export function Menu({ trigger, items, label, align = "end" }: MenuProps) {
  const id = useId();
  const Link = useLinkComponent();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const insideRefs = useMemo(() => [triggerRef, listRef], []);

  const itemElements = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
  const focusItem = (index: number) => {
    const elements = itemElements();
    elements.at(((index % elements.length) + elements.length) % elements.length)?.focus();
  };

  // Focus moves to an item once the list is in the document (it renders in a portal).
  const pendingFocus = useRef<"first" | "last" | null>(null);
  useEffect(() => {
    if (!open || !pendingFocus.current || !listRef.current) return;
    focusItem(pendingFocus.current === "first" ? 0 : -1);
    pendingFocus.current = null;
  });

  const openMenu = (focus: "first" | "last") => {
    pendingFocus.current = focus;
    setOpen(true);
  };
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEscape(open, () => close(true));
  useOutsidePress(insideRefs, open, () => close(false));

  const onListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const elements = itemElements();
    const index = elements.indexOf(document.activeElement as HTMLElement);
    const moves: Record<string, () => void> = {
      ArrowDown: () => focusItem(index + 1),
      ArrowUp: () => focusItem(index - 1),
      Home: () => focusItem(0),
      End: () => focusItem(-1),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      move();
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  const triggerElement = cloneElement(trigger, {
    ref: triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? id : undefined,
    onClick: () => (open ? close(false) : openMenu("first")),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(event.key === "ArrowDown" ? "first" : "last");
      }
    },
  });

  return (
    <>
      {triggerElement}
      <PopoverSurface ref={listRef} as="ul" open={open} anchor={triggerRef} align={align} id={id} role="menu" aria-label={label} onKeyDown={onListKeyDown}>
        {items.map((item) => {
          const content = (
            <>
              {item.icon && <Icon icon={item.icon} />}
              <span className="min-w-0 flex-1">{item.label}</span>
            </>
          );
          const className = cn(ITEM_CLASSES, item.danger && "text-danger", item.current && "font-semibold text-primary");
          return (
            <li key={item.id} role="none">
              {item.href ? (
                <Link href={item.href} role="menuitem" tabIndex={-1} aria-current={item.current ? "page" : undefined} className={className} onClick={() => close(false)}>
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => {
                    close(true);
                    item.onSelect?.();
                  }}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </PopoverSurface>
    </>
  );
}
