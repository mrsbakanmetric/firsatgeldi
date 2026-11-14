"use client";

// AttributeChip (product_design_pattern.md §5.27; pagedesign.md §8.2 design v3):
// a small grey chip "Model Ace Pro 2" (components.chip) that opens a menu overlay
// with the allowed values of the category template — it never pushes the page.
// One click applies a value; "Listede yoksa yaz" at the bottom applies on Enter.
// No apply or close button, no warning before a change: the screen shows
// "<attribute> değişti · Geri al" after it. Outside click/tap and Esc close the
// menu (components.popover-dismiss).
import { Check, ChevronDown } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useEscape, useOutsidePress } from "./overlay";
import { PopoverSurface } from "./popover";

/**
 * Classes of a quick-choice chip (components.chip): 32 px grey pill with caption
 * text; the hit area stays size.touch-target-min. Never primary-coloured borders.
 */
export function chipClasses(className?: string): string {
  return cn(
    "relative inline-flex h-(--component-chip-height) shrink-0 items-center gap-1 rounded-(--component-chip-radius) border border-border bg-surface-alt px-(--component-chip-padding-x) text-caption text-text hover:bg-surface",
    "before:absolute before:inset-x-0 before:top-1/2 before:h-(--component-chip-hit-area) before:-translate-y-1/2",
    focusRing,
    className,
  );
}

export interface AttributeChipTexts {
  /** Heading of the value list ("Bu modelde bulunan renkler"); defaults to the label. */
  listHeading?: string;
  /** Field label "Listede yoksa yaz". */
  typeLabel: string;
}

export interface AttributeChipProps {
  label: string;
  value: string;
  options: readonly string[];
  onPick: (value: string) => void;
  /** The value differs from what we understood (shown in weight, not colour alone). */
  changed?: boolean;
  texts: AttributeChipTexts;
}

export function AttributeChip({ label, value, options, onPick, changed = false, texts }: AttributeChipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLElement>(null);
  const insideRefs = useMemo(() => [triggerRef, surfaceRef], []);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setTyped("");
    if (returnFocus) triggerRef.current?.focus();
  };
  useEscape(open, () => close(true));
  useOutsidePress(insideRefs, open, () => close(false));

  // The current value takes focus once the menu is in the document (it renders in a portal).
  useEffect(() => {
    if (!open) return;
    const surface = surfaceRef.current;
    (surface?.querySelector<HTMLElement>("[aria-selected='true']") ?? surface?.querySelector<HTMLElement>("[role='option']"))?.focus();
  }, [open]);

  const pick = (next: string) => {
    close(true);
    if (next !== value) onPick(next);
  };
  const submitTyped = (event: FormEvent) => {
    event.preventDefault();
    const next = typed.trim();
    if (next) pick(next);
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>("[role='option']") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    items.at((index + (event.key === "ArrowDown" ? 1 : -1)) % items.length)?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={chipClasses(changed ? "border-text-muted" : undefined)}
      >
        <span className="text-text-muted">{label}</span>
        <span className={changed ? "font-bold" : "font-semibold"}>{value}</span>
        <Icon icon={ChevronDown} size="sm" className="text-text-muted" />
      </button>
      <PopoverSurface ref={surfaceRef} open={open} anchor={triggerRef} align="start" id={`${id}-menu`} className="gap-1">
        <p id={`${id}-heading`} className="px-3 pt-2 text-caption text-text-muted">
          {texts.listHeading ?? label}
        </p>
        <div role="listbox" aria-labelledby={`${id}-heading`} className="flex flex-col" onKeyDown={onListKeyDown}>
          {options.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(option)}
                className={cn(
                  "flex min-h-(--size-touch-target-min) w-full items-center gap-2 rounded-md px-3 text-left text-body-sm text-text outline-none hover:bg-surface-alt focus-visible:bg-surface-alt",
                  selected && "font-semibold",
                )}
              >
                <span className="flex size-(--size-icon-sm) shrink-0 items-center justify-center">{selected && <Icon icon={Check} size="sm" className="text-primary" />}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        <form onSubmit={submitTyped} className="flex flex-col gap-1 border-t border-divider px-3 pt-2 pb-2">
          <label htmlFor={`${id}-typed`} className="text-caption text-text-muted">
            {texts.typeLabel}
          </label>
          <input
            id={`${id}-typed`}
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className={cn("h-(--size-touch-target-min) w-full min-w-0 rounded-md border border-border bg-surface-alt px-3 text-body-sm text-text", focusRing)}
          />
        </form>
      </PopoverSurface>
    </>
  );
}
