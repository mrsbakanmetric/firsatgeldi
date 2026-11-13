// Avatar (product_design_pattern.md §5.34, §5.36): initials on primary-subtle;
// 34 (top bar), 40 (rows), 96 (profile header). Decorative inside a labelled
// button; otherwise pass `label`.
import { cn } from "./cn";

export type AvatarSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "size-(--component-avatar-size-sm) text-caption",
  md: "size-(--component-avatar-size-md) text-body-sm",
  lg: "size-(--component-avatar-size-lg) text-h1",
};

export interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  /** Accessible name when the avatar stands alone; omit inside a labelled button. */
  label?: string;
  className?: string;
}

export function Avatar({ initials, size = "md", label, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill bg-primary-subtle font-bold text-on-primary-subtle select-none",
        SIZE_CLASSES[size],
        className,
      )}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {initials}
    </span>
  );
}
