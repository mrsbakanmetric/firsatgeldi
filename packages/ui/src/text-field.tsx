"use client";

// TextField (product_design_pattern.md §5.36): label always visible above the
// field, optional helper below; error = icon + message + danger border, never
// colour alone. Password fields get a show/hide toggle.
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id" | "aria-invalid" | "aria-describedby"> {
  label: string;
  type?: "text" | "email" | "password" | "number" | "search";
  helper?: string;
  /** Says what is wrong and how to fix it. */
  error?: string;
  /** Labels of the password toggle (from the i18n catalogue). */
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, type = "text", helper, error, showPasswordLabel, hidePasswordLabel, className, ...input },
  ref,
) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error ? errorId : null, helper ? helperId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-body-sm font-semibold text-text">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-(--component-input-height) w-full min-w-0 rounded-md border bg-surface-alt px-3 text-body text-text placeholder:text-text-muted",
            "focus-visible:border-primary",
            error ? "border-danger" : "border-border",
            isPassword && "pr-12",
            focusRing,
          )}
          {...input}
        />
        {isPassword && showPasswordLabel && hidePasswordLabel && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? hidePasswordLabel : showPasswordLabel}
            aria-pressed={revealed}
            className={cn(
              "absolute right-0 flex size-(--size-touch-target-min) items-center justify-center rounded-md text-text-muted hover:text-text",
              focusRing,
            )}
          >
            <Icon icon={revealed ? EyeOff : Eye} />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-caption text-danger">
          <Icon icon={CircleAlert} size="sm" />
          <span>{error}</span>
        </p>
      )}
      {helper && (
        <p id={helperId} className="text-caption text-text-muted">
          {helper}
        </p>
      )}
    </div>
  );
});
