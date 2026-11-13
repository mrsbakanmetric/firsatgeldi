"use client";

// Button (product_design_pattern.md §4.1, §4.2, §5.36). Variants: primary,
// deal (coral, once per surface, only for the deal moment), secondary, ghost,
// danger, link. Loading keeps the width and blocks a second press; an
// icon-only button carries its label as aria-label and as a Tooltip.
import type { LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { Tooltip } from "./tooltip";

export type ButtonVariant = "primary" | "deal" | "secondary" | "ghost" | "danger" | "link";

const BASE_CLASSES =
  "relative inline-flex items-center justify-center gap-2 rounded-md text-center font-semibold transition-colors duration-(--duration-fast) ease-standard";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "min-h-(--component-button-primary-height) px-5 py-2 text-button bg-primary text-on-primary hover:bg-primary-hover",
  deal: "min-h-(--component-button-deal-height) px-5 py-2 text-button bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "min-h-(--component-button-secondary-height) px-5 py-2 text-button border border-primary bg-surface text-primary hover:bg-primary-subtle",
  ghost: "min-h-(--component-button-ghost-height) px-3 py-2 text-body-sm font-semibold text-primary hover:bg-surface-alt",
  danger: "min-h-(--component-button-danger-height) px-5 py-2 text-button bg-danger text-text-inverse",
  link: "rounded-sm text-body font-medium text-primary underline underline-offset-4 hover:text-primary-hover",
};

/** Square size for icon-only buttons, per variant height. */
const ICON_ONLY_CLASSES: Record<ButtonVariant, string> = {
  primary: "min-w-(--component-button-primary-height) px-0",
  deal: "min-w-(--component-button-deal-height) px-0",
  secondary: "min-w-(--component-button-secondary-height) px-0",
  ghost: "min-h-(--size-touch-target-min) min-w-(--size-touch-target-min) px-0 text-text",
  danger: "min-w-(--component-button-danger-height) px-0",
  link: "",
};

/** Classes of a button variant, for links that look like buttons (e.g. "Ücretsiz başla"). */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], focusRing, className);
}

interface CommonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  /** Shows progress in place; the button keeps its width and cannot be pressed again. */
  loading?: boolean;
}

interface TextButtonProps extends CommonProps {
  children: string;
  iconOnly?: false;
}

interface IconOnlyButtonProps extends CommonProps {
  icon: LucideIcon;
  iconOnly: true;
  /** Accessible name, also shown as a tooltip on pointer devices. */
  label: string;
  children?: never;
}

export type ButtonProps = TextButtonProps | IconOnlyButtonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { variant = "primary", icon, loading = false, className, disabled, type = "button", ...rest } = props;
  const iconOnly = props.iconOnly === true;
  const native = { ...rest } as Record<string, unknown>;
  delete native["iconOnly"];
  delete native["label"];
  delete native["children"];

  const content = (
    <>
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "opacity-0")}>
        {icon && <Icon icon={icon} size={iconOnly ? "lg" : "md"} />}
        {!iconOnly && props.children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="size-(--size-icon-sm) rounded-pill border-(length:--border-width-strong) border-current border-r-transparent motion-safe:animate-spin" />
        </span>
      )}
    </>
  );

  const button = (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? props.label : undefined}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        iconOnly && ICON_ONLY_CLASSES[variant],
        focusRing,
        disabled && !loading && "cursor-not-allowed opacity-(--component-button-disabled-opacity)",
        className,
      )}
      {...native}
    >
      {content}
    </button>
  );

  return iconOnly ? (
    <Tooltip text={props.label} duplicatesLabel>
      {button}
    </Tooltip>
  ) : (
    button
  );
});
