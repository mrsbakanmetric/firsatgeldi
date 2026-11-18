// Notification item (product_design_pattern.md §5.29 [DECIDED]; pagedesign.md §8.5 design v2.1)
// and the mode badge (§5.29: "Aldım" primary-subtle, "Almak istiyorum" surface-alt, "Takipte
// değil" dashed outline). Row: unread dot · image 72 (`size.thumb-md`; 48 in the bell panel) with the type as a
// corner badge · type + time · title · message · mode badge + check time · action column; the
// columns are fixed so rows align. Faded rows (a deal that ended) show at 60 %.
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

/** The dot between the type and the time (punctuation, not text). */
const SEPARATOR = "·";

export type ModeBadgeMode = "BOUGHT" | "WANT" | "NOT_TRACKED";

const MODE_CLASSES: Record<ModeBadgeMode, string> = {
  BOUGHT: "bg-primary-subtle text-on-primary-subtle",
  WANT: "bg-surface-alt text-text",
  NOT_TRACKED: "border border-dashed border-border text-text-muted",
};

/** "Aldım" · "Almak istiyorum" · "Takipte değil". */
export function ModeBadge({ mode, label }: { mode: ModeBadgeMode; label: string }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-pill px-2 py-1 text-caption font-semibold whitespace-nowrap", MODE_CLASSES[mode])}>{label}</span>;
}

/** Type badge tones (§5.29): deal = ink, return = warning-subtle, delivery/account = info, drop/stock/saving = primary. */
export type NotificationBadgeTone = "ink" | "muted" | "info" | "info-subtle" | "warning" | "primary";

const BADGE_CLASSES: Record<NotificationBadgeTone, string> = {
  ink: "bg-text text-surface",
  muted: "bg-surface-alt text-text-muted",
  info: "bg-info text-surface",
  "info-subtle": "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-on-warning-subtle",
  primary: "bg-primary text-on-primary",
};

/** A tile in place of the product image: lock (account) or person (follow). */
export function NotificationTile({ icon, size = "page" }: { icon: LucideIcon; size?: "page" | "panel" }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-md bg-surface-alt text-text", size === "page" ? "size-(--size-thumb-md)" : "size-(--size-thumb-sm)")}>
      <Icon icon={icon} />
    </span>
  );
}

export interface NotificationItemProps {
  unread: boolean;
  /** Read aloud for the dot ("okunmadı"). */
  unreadLabel: string;
  faded?: boolean;
  /** Product image (`ProductImage` md, 72 px) or a tile. */
  media: ReactNode;
  badge: { icon: LucideIcon; tone: NotificationBadgeTone };
  type: string;
  /** The time as shown ("14.32", "12 Kas") and its machine value. */
  time: { label: string; iso: string };
  /** The title, usually a link or button that opens the item. */
  title: ReactNode;
  body: string;
  mode?: ReactNode;
  /** One muted line: the check time and what it refers to. */
  meta?: string;
  /** The action column (one action, a second text action when needed). */
  actions?: ReactNode;
}

export function NotificationItem({ unread, unreadLabel, faded = false, media, badge, type, time, title, body, mode, meta, actions }: NotificationItemProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-3 py-4 md:flex-nowrap md:gap-4 md:pr-5", faded && "opacity-60")}>
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-pill", unread ? "bg-primary" : "bg-transparent")} />
      <span className="relative shrink-0">
        {media}
        <span aria-hidden="true" className={cn("absolute -right-1 -bottom-1 flex size-(--size-icon-lg) items-center justify-center rounded-pill border-(length:--border-width-strong) border-surface", BADGE_CLASSES[badge.tone])}>
          <Icon icon={badge.icon} size="sm" />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1 text-caption text-text-muted">
          <span className="font-semibold">{type}</span>
          <span aria-hidden="true">{SEPARATOR}</span>
          <time dateTime={time.iso}>{time.label}</time>
          {unread && <span className="sr-only">{unreadLabel}</span>}
        </div>
        <div className={cn("truncate text-body text-text", unread ? "font-bold" : "font-semibold")}>{title}</div>
        <p className="text-body-sm text-text">{body}</p>
        {(mode || meta) && (
          <div className="flex flex-wrap items-center gap-2">
            {mode}
            {meta && <span className="text-caption text-text-muted">{meta}</span>}
          </div>
        )}
      </div>
      {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 pl-5 md:w-(--size-card-outcome-width) md:flex-col md:items-stretch md:pl-0">{actions}</div>}
    </div>
  );
}
