// Flag (product_design_pattern.md §5.8): small pill with icon + short text.
// Fixed vocabulary mapped to the five meanings: deal (coral, once per surface),
// warning (amber), danger (red), info, success (emerald), neutral.
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

export type FlagTone = "deal" | "warning" | "danger" | "info" | "success" | "neutral";

const TONE_CLASSES: Record<FlagTone, string> = {
  deal: "bg-accent text-on-accent",
  warning: "bg-warning-subtle text-on-warning-subtle",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  success: "bg-primary-subtle text-on-primary-subtle",
  neutral: "bg-surface-alt text-text",
};

export interface FlagProps {
  tone: FlagTone;
  icon?: LucideIcon;
  children: string;
  className?: string;
}

export function Flag({ tone, icon, children, className }: FlagProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-pill px-2 py-1 text-caption", TONE_CLASSES[tone], className)}>
      {icon && <Icon icon={icon} size="sm" />}
      <span>{children}</span>
    </span>
  );
}
