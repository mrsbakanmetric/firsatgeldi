// EmptyState (pagedesign.md §5, §7): short title + one sentence + one primary
// action; explains what will appear here.
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The single next step (a primary Button or link). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-2 py-6 text-center", className)}>
      <span className="flex size-16 items-center justify-center rounded-pill bg-primary-subtle text-on-primary-subtle">
        <Icon icon={icon} size="lg" />
      </span>
      <p className="text-h3 text-text">{title}</p>
      <p className="text-body-sm text-text-muted">{description}</p>
      {action}
    </div>
  );
}
