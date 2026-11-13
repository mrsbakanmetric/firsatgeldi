"use client";

// Checkbox (product_design_pattern.md §5.36): 20 px box inside a 44 px touch
// target; checked = primary fill with a check icon. Consent checkboxes are
// never pre-ticked. Indeterminate state for "select all".
import { Check, Minus } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface CheckboxProps {
  /** Text, or text with links (e.g. consent with a link to the full text). */
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ label, checked, onCheckedChange, indeterminate = false, disabled = false, className }: CheckboxProps) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const filled = checked || indeterminate;

  return (
    <div className={cn("flex min-h-(--size-touch-target-min) items-center gap-3", disabled && "opacity-(--component-button-disabled-opacity)", className)}>
      <span className="relative flex size-(--size-touch-target-min) shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className={cn(
            "peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-md",
            "outline-none focus-visible:outline-solid focus-visible:outline-(length:--border-width-strong) focus-visible:outline-focus-ring",
            disabled && "cursor-not-allowed",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none flex size-(--component-checkbox-box-size) items-center justify-center rounded-sm border-(length:--border-width-strong)",
            filled ? "border-primary bg-primary text-on-primary" : "border-border bg-surface",
          )}
        >
          {filled && <Icon icon={indeterminate ? Minus : Check} size="sm" />}
        </span>
      </span>
      <label htmlFor={id} className={cn("text-body text-text", !disabled && "cursor-pointer")}>
        {label}
      </label>
    </div>
  );
}
