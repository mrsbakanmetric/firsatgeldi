"use client";

// SearchField (product_design_pattern.md §5.30; pagedesign.md §8.2): a search
// box with its label, a clear control and trailing actions (photo, "Ara").
// "large" is the Search and Add box (components.search-box, min-height 48; the
// × shows only while there is text); "list" sits above a list. Combobox
// attributes are passed through for autocomplete.
import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id" | "size"> {
  /** Visible label above the box, or the accessible name when `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  size?: "large" | "list";
  /** Clear control ("Aramayı temizle"); shown when the box has text. */
  clearLabel?: string;
  onClear?: () => void;
  /** Buttons inside the box, after the text (e.g. "Fotoğraf ekle", "Ara"). */
  trailing?: ReactNode;
  /** Content under the box inside the same frame (e.g. attached photo thumbnails). */
  below?: ReactNode;
  /**
   * Inline completion (pagedesign.md §8.2 v4): the rest of the first suggestion's name,
   * drawn muted right after the typed text; the caller accepts it on Tab / →.
   */
  completion?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, hideLabel = false, size = "large", clearLabel, onClear, trailing, below, completion, className, value, ...input },
  ref,
) {
  const id = useId();
  const hasText = typeof value === "string" && value.length > 0;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={cn("text-body-sm font-semibold text-text", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 border border-border bg-surface focus-within:border-primary",
          size === "large" ? "min-h-(--component-search-box-min-height) justify-center rounded-(--component-search-box-radius) px-3 shadow-sm" : "rounded-md px-3",
        )}
      >
        <div className="flex min-h-(--size-touch-target-min) flex-1 items-center gap-2">
          <Icon icon={Search} className="text-text-muted" />
          <span className="relative flex min-w-0 flex-1">
            {completion && hasText && (
              // Same font as the input; the typed part is invisible so the completion starts at the caret.
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-body whitespace-pre">
                <span className="invisible">{value}</span>
                <span className="text-text-muted">{completion}</span>
              </span>
            )}
            <input
              ref={ref}
              id={id}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={value}
              className="relative h-(--size-touch-target-min) w-full min-w-0 bg-transparent text-body text-text outline-none placeholder:text-text-muted"
              {...input}
            />
          </span>
          {hasText && clearLabel && onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label={clearLabel}
              className={cn("flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill text-text-muted hover:bg-surface-alt", focusRing)}
            >
              <Icon icon={X} />
            </button>
          )}
          {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
        </div>
        {below}
      </div>
    </div>
  );
});
