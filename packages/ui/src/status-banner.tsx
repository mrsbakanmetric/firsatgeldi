// StatusBanner (pagedesign.md §6, §7): info / warning / danger. Error = danger
// ("what happened + what still works + Tekrar dene"); stale = warning with the
// age; limits and notes = info. Icon + text, never colour alone.
import { CircleAlert, Clock, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

export type StatusTone = "info" | "warning" | "danger";

const TONE_CLASSES: Record<StatusTone, { box: string; title: string; icon: LucideIcon }> = {
  info: { box: "bg-info-subtle", title: "text-info", icon: Info },
  warning: { box: "bg-warning-subtle", title: "text-on-warning-subtle", icon: Clock },
  danger: { box: "bg-danger-subtle", title: "text-danger", icon: CircleAlert },
};

export interface StatusBannerProps {
  tone: StatusTone;
  title?: string;
  children: ReactNode;
  /** One action, e.g. a secondary "Tekrar dene" button. */
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function StatusBanner({ tone, title, children, action, icon, className }: StatusBannerProps) {
  const style = TONE_CLASSES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex flex-col gap-3 rounded-lg p-4", style.box, className)}>
      <div className="flex items-start gap-2">
        <Icon icon={icon ?? style.icon} className={style.title} />
        <div className="flex min-w-0 flex-col gap-1">
          {title && <p className={cn("text-body font-semibold", style.title)}>{title}</p>}
          <div className="text-body-sm text-text">{children}</div>
        </div>
      </div>
      {action && <div className="flex">{action}</div>}
    </div>
  );
}
