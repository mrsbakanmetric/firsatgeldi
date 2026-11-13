// Icon (product_design_pattern.md §5.36): Lucide outline icons, stroke 2,
// currentColor, sizes icon-sm / icon-md / icon-lg. Decorative by default;
// pass `label` when the icon alone carries meaning.
import { tokens } from "@firsatgeldi/tokens";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export type IconSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<IconSize, string> = {
  sm: "size-(--size-icon-sm)",
  md: "size-(--size-icon-md)",
  lg: "size-(--size-icon-lg)",
};

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  /** Accessible name; omit for decorative icons next to a text label. */
  label?: string;
  className?: string;
}

export function Icon({ icon: Glyph, size = "md", label, className }: IconProps) {
  return (
    <Glyph
      className={cn("shrink-0", SIZE_CLASSES[size], className)}
      strokeWidth={tokens.components.icon["stroke-width"]}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
