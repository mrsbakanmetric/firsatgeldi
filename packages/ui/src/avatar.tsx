// Avatar (product_design_pattern.md §5.34, §5.36): the user's optional photo
// [DECIDED 2026-11-18], otherwise initials on primary-subtle;
// 34 (top bar), 40 (rows), 96 (profile header). Decorative inside a labelled
// button; otherwise pass `label`.
import { cn } from "./cn";

/** The photo is decorative: the avatar's label (or the button around it) names the person. */
const DECORATIVE = "";

export type AvatarSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "size-(--component-avatar-size-sm) text-caption",
  md: "size-(--component-avatar-size-md) text-body-sm",
  lg: "size-(--component-avatar-size-lg) text-h1",
};

export interface AvatarProps {
  initials: string;
  /** Profile photo URL; without it the initials show. */
  src?: string | null;
  size?: AvatarSize;
  /** Accessible name when the avatar stands alone; omit inside a labelled button. */
  label?: string;
  className?: string;
}

export function Avatar({ initials, src, size = "md", label, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-primary-subtle font-bold text-on-primary-subtle select-none",
        SIZE_CLASSES[size],
        className,
      )}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {src ? <img src={src} alt={DECORATIVE} className="size-full rounded-pill object-cover" /> : initials}
    </span>
  );
}
