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

/** Colours per variant; the same for every size. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  deal: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-primary bg-surface text-primary hover:bg-primary-subtle",
  ghost: "text-primary hover:bg-surface-alt",
  danger: "bg-danger text-text-inverse",
  link: "rounded-sm text-body font-medium text-primary underline underline-offset-4 hover:text-primary-hover",
};

/** Height, padding and type of the default size. */
const DEFAULT_SIZE_CLASSES: Record<ButtonVariant, string> = {
  primary: "min-h-(--component-button-primary-height) px-5 py-2 text-button",
  deal: "min-h-(--component-button-deal-height) px-5 py-2 text-button",
  secondary: "min-h-(--component-button-secondary-height) px-5 py-2 text-button",
  // 44 px below breakpoint.md and on touch; 40 px only from breakpoint.md with a mouse (§4.2).
  ghost: "min-h-(--component-button-ghost-height-touch) md:pointer-fine:min-h-(--component-button-ghost-height) px-3 py-2 text-body-sm font-semibold",
  danger: "min-h-(--component-button-danger-height) px-5 py-2 text-button",
  link: "",
};

/**
 * components.button.compact: same colours, 36 px only from breakpoint.md with a
 * fine pointer; otherwise the hit area stays size.touch-target-min.
 */
const COMPACT_SIZE_CLASSES =
  "min-h-(--component-button-compact-height-touch) md:pointer-fine:min-h-(--component-button-compact-height) rounded-(--component-button-compact-radius) px-3 py-1 text-body-sm";

/** Square size for icon-only buttons, per variant height. */
const ICON_ONLY_CLASSES: Record<ButtonVariant, string> = {
  primary: "min-w-(--component-button-primary-height) px-0",
  deal: "min-w-(--component-button-deal-height) px-0",
  secondary: "min-w-(--component-button-secondary-height) px-0",
  ghost: "min-h-(--size-touch-target-min) min-w-(--size-touch-target-min) px-0 text-text",
  danger: "min-w-(--component-button-danger-height) px-0",
  link: "",
};

const COMPACT_ICON_ONLY_CLASSES =
  "min-w-(--component-button-compact-height-touch) md:pointer-fine:min-w-(--component-button-compact-height) px-0";

export type ButtonSize = "default" | "compact";

function sizeClasses(variant: ButtonVariant, size: ButtonSize): string {
  return size === "compact" && variant !== "link" ? COMPACT_SIZE_CLASSES : DEFAULT_SIZE_CLASSES[variant];
}

/** Classes of a button variant, for links that look like buttons (e.g. "Ücretsiz başla"). */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string, size: ButtonSize = "default"): string {
  return cn(BASE_CLASSES, sizeClasses(variant, size), VARIANT_CLASSES[variant], focusRing, className);
}

interface CommonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  variant?: ButtonVariant;
  /** "compact" = components.button.compact (search box action, quick confirm, small inline actions). */
  size?: ButtonSize;
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
  const { variant = "primary", size = "default", icon, loading = false, className, disabled, type = "button", ...rest } = props;
  const iconOnly = props.iconOnly === true;
  const native = { ...rest } as Record<string, unknown>;
  delete native["iconOnly"];
  delete native["label"];
  delete native["children"];

  const content = (
    <>
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "opacity-0")}>
        {icon && <Icon icon={icon} size={iconOnly && size === "default" ? "lg" : "md"} />}
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
        sizeClasses(variant, size),
        VARIANT_CLASSES[variant],
        iconOnly && (size === "compact" ? cn(COMPACT_ICON_ONLY_CLASSES, variant === "ghost" && "text-text") : ICON_ONLY_CLASSES[variant]),
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
