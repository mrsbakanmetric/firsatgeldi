"use client";

// Switch (product_design_pattern.md §5.36): on/off that takes effect
// immediately. Track 48 × 28, thumb 22; on = primary, off = border. A locked
// switch is shown at reduced opacity with its reason next to it.
import { useId } from "react";
import { cn, focusRing } from "./cn";

export interface SwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Optional one-line description under the label. */
  description?: string;
  /** Why the switch cannot be changed; makes it locked. */
  lockedReason?: string;
  className?: string;
}

export function Switch({ label, checked, onCheckedChange, description, lockedReason, className }: SwitchProps) {
  const id = useId();
  const locked = lockedReason !== undefined;
  const describedBy = [description ? `${id}-description` : null, locked ? `${id}-reason` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex min-h-(--size-touch-target-min) items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col">
        <span id={`${id}-label`} className="text-body text-text">
          {label}
        </span>
        {description && (
          <span id={`${id}-description`} className="text-body-sm text-text-muted">
            {description}
          </span>
        )}
        {locked && (
          <span id={`${id}-reason`} className="text-caption text-text-muted">
            {lockedReason}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        disabled={locked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "flex h-(--size-touch-target-min) shrink-0 items-center rounded-pill",
          locked && "cursor-not-allowed opacity-(--component-switch-locked-opacity)",
          focusRing,
        )}
      >
        <span
          className={cn(
            "flex h-(--component-switch-track-height) w-(--component-switch-track-width) items-center rounded-pill px-(--component-switch-thumb-offset)",
            "transition-colors duration-(--duration-fast) ease-standard",
            checked ? "justify-end bg-primary" : "justify-start bg-border",
          )}
        >
          <span className="size-(--component-switch-thumb-size) rounded-pill bg-surface shadow-sm" />
        </span>
      </button>
    </div>
  );
}
