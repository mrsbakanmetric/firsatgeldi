"use client";

// Select (product_design_pattern.md §5.36): single choice from a list;
// options may carry counts ("Elektronik · 12"). Base of SortSelect,
// PeriodSelect and the many-categories CategoryFilter. Toolbar selects use the
// compact height. Below breakpoint.md the list opens as a bottom sheet.
// ARIA: select-only combobox (button + listbox, aria-activedescendant).
import { Check, ChevronDown } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useEscape, useOutsidePress } from "./overlay";
import { PopoverSurface } from "./popover";

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
}

export interface SelectProps {
  label: string;
  options: readonly SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Toolbar form: compact height (touch-target-min), surface background. */
  compact?: boolean;
  /** Keeps the label for assistive technology only (toolbars where the value speaks for itself). */
  hideLabel?: boolean;
  /** Formats an option's count in the user's language. */
  formatCount?: (count: number) => string;
  className?: string;
}

export function Select({ label, options, value, onValueChange, compact = false, hideLabel = false, formatCount = String, className }: SelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const labelId = `${id}-label`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const insideRefs = useMemo(() => [buttonRef, listRef], []);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];
  const optionId = (index: number) => `${id}-option-${index}`;

  const show = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option) onValueChange(option.value);
    close();
  };

  useEscape(open, close);
  useOutsidePress(insideRefs, open, () => setOpen(false));

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    const keys: Record<string, () => void> = open
      ? {
          ArrowDown: () => setActive((index) => Math.min(last, index + 1)),
          ArrowUp: () => setActive((index) => Math.max(0, index - 1)),
          Home: () => setActive(0),
          End: () => setActive(last),
          Enter: () => choose(active),
          " ": () => choose(active),
          Tab: () => setOpen(false),
        }
      : {
          ArrowDown: () => show(),
          ArrowUp: () => show(),
          Enter: () => show(),
          " ": () => show(),
        };
    const action = keys[event.key];
    if (!action) return;
    if (event.key !== "Tab") event.preventDefault();
    action();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span id={labelId} className={cn("text-body-sm font-semibold text-text", hideLabel && "sr-only")}>
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-labelledby={`${labelId} ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 text-left text-body text-text",
          compact ? "h-(--size-touch-target-min) bg-surface text-body-sm" : "h-(--component-input-height) bg-surface-alt",
          focusRing,
        )}
      >
        <span id={`${id}-value`} className="min-w-0 truncate">
          {selected?.label}
        </span>
        <Icon icon={ChevronDown} className="text-text-muted" />
      </button>
      <PopoverSurface
        ref={listRef}
        as="ul"
        open={open}
        anchor={buttonRef}
        align="start"
        matchWidth
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selected?.value;
          return (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onPointerMove={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={cn(
                "flex min-h-(--size-touch-target-min) cursor-pointer items-center gap-3 rounded-md px-3 text-body text-text",
                index === active && "bg-surface-alt",
                isSelected && "font-semibold",
              )}
            >
              <span className="min-w-0 flex-1">{option.label}</span>
              {option.count !== undefined && <span className="text-body-sm text-text-muted tabular-nums">{formatCount(option.count)}</span>}
              <Icon icon={Check} size="sm" className={cn("text-primary", !isSelected && "invisible")} />
            </li>
          );
        })}
      </PopoverSurface>
    </div>
  );
}
