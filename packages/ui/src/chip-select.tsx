"use client";

// SortSelect and CategoryFilter (pagedesign.md §5, §8.4 design v2): a small grey
// chip ("Sırala: Öncelik", "Kategori") that opens a menu overlay of choices with
// optional counts. One click applies; it never pushes the page; a click outside
// and Esc close it (components.popover-dismiss); no "Kapat" or "Uygula" inside.
import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { chipClasses } from "./attribute-chip";
import { cn } from "./cn";
import { Icon } from "./icon";
import { useEscape, useOutsidePress } from "./overlay";
import { PopoverSurface } from "./popover";

export interface ChipSelectOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface ChipSelectProps<T extends string> {
  /** Chip caption ("Sırala", "Kategori"). */
  label: string;
  /** The current choice written on the chip; null shows only the label. */
  valueLabel: string | null;
  options: readonly ChipSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  align?: "start" | "end";
}

function ChipSelect<T extends string>({ label, valueLabel, options, value, onChange, align = "start" }: ChipSelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLElement>(null);
  const insideRefs = useMemo(() => [triggerRef, surfaceRef], []);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };
  useEscape(open, () => close(true));
  useOutsidePress(insideRefs, open, () => close(false));

  // The current choice takes focus once the menu is in the document (it renders in a portal).
  useEffect(() => {
    if (!open) return;
    const surface = surfaceRef.current;
    (surface?.querySelector<HTMLElement>("[aria-selected='true']") ?? surface?.querySelector<HTMLElement>("[role='option']"))?.focus();
  }, [open]);

  const pick = (next: T) => {
    close(true);
    if (next !== value) onChange(next);
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
        className={chipClasses()}
      >
        <span className={valueLabel ? "text-text-muted" : undefined}>{label}</span>
        {valueLabel && <span className="font-semibold">{valueLabel}</span>}
        <Icon icon={ChevronDown} size="sm" className="text-text-muted" />
      </button>
      <PopoverSurface ref={surfaceRef} open={open} anchor={triggerRef} align={align} id={`${id}-menu`}>
        <div role="listbox" aria-label={label} className="flex flex-col" onKeyDown={onListKeyDown}>
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(option.id)}
                className={cn(
                  "flex min-h-(--component-menu-item-height) w-full items-center gap-2 rounded-md px-3 text-left text-body-sm text-text outline-none hover:bg-surface-alt focus-visible:bg-surface-alt",
                  selected && "font-semibold",
                )}
              >
                <span className="flex size-(--size-icon-sm) shrink-0 items-center justify-center">{selected && <Icon icon={Check} size="sm" className="text-primary" />}</span>
                <span className="min-w-0 flex-1">{option.label}</span>
                {option.count !== undefined && <span className="text-caption text-text-muted tabular-nums">{option.count}</span>}
              </button>
            );
          })}
        </div>
      </PopoverSurface>
    </>
  );
}

export interface SortSelectProps<T extends string> {
  label: string;
  options: readonly ChipSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** "Sırala: Öncelik ▾". */
export function SortSelect<T extends string>({ label, options, value, onChange }: SortSelectProps<T>) {
  return <ChipSelect label={label} valueLabel={options.find((option) => option.id === value)?.label ?? null} options={options} value={value} onChange={onChange} />;
}

export interface CategoryFilterProps {
  label: string;
  /** First entry "Tümü" (id ""), then the categories with counts. */
  options: readonly ChipSelectOption<string>[];
  value: string;
  onChange: (value: string) => void;
}

/** "Kategori ▾" — shows the chosen category once one is picked. */
export function CategoryFilter({ label, options, value, onChange }: CategoryFilterProps) {
  const chosen = value ? (options.find((option) => option.id === value)?.label ?? null) : null;
  return <ChipSelect label={label} valueLabel={chosen} options={options} value={value} onChange={onChange} />;
}
