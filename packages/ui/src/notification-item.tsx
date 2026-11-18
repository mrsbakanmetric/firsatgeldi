// Notification item (product_design_pattern.md §5.29 [DECIDED]; pagedesign.md §8.5 design v2.1)
// and the mode badge (§5.29: "Aldım" primary-subtle, "Almak istiyorum" surface-alt, "Takipte
// değil" dashed outline). Row: unread dot · image 72 (`size.thumb-md`; 48 in the bell panel) with the type as a
// corner badge · type + time · title · message · mode badge + check time · action column; the
// columns are fixed so rows align. Faded rows (a deal that ended) show at 60 %.
import { type LucideIcon, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn, focusRing } from "./cn";
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
  /** Bell panel: 48 px image, tighter padding, no action column (the preview carries the actions). */
  compact?: boolean;
}

export function NotificationItem({ unread, unreadLabel, faded = false, media, badge, type, time, title, body, mode, meta, actions, compact = false }: NotificationItemProps) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "px-3 py-3" : "flex-wrap px-3 py-4 md:flex-nowrap md:gap-4 md:pr-5", faded && "opacity-60")}>
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-pill", unread ? "bg-primary" : "bg-transparent")} />
      <span className="relative shrink-0">
        {media}
        <span aria-hidden="true" className={cn("absolute -right-1 -bottom-1 flex size-(--size-step-indicator-dot) items-center justify-center rounded-pill border-(length:--border-width-strong) border-surface", BADGE_CLASSES[badge.tone])}>
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
        <div className={cn("truncate text-text", compact ? "text-body-sm" : "text-body", unread ? "font-bold" : "font-semibold")}>{title}</div>
        <p className={cn("text-text", compact ? "line-clamp-2 text-caption" : "text-body-sm")}>{body}</p>
        {(mode || meta) && (
          <div className="flex flex-wrap items-center gap-2">
            {mode}
            {meta && <span className="text-caption text-text-muted">{meta}</span>}
          </div>
        )}
      </div>
      {actions && !compact && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 pl-5 md:w-(--size-card-outcome-width) md:flex-col md:items-stretch md:pl-0">{actions}</div>}
    </div>
  );
}

// ── NotificationPreview ──────────────────────────────────────────────────────

export interface NotificationPreviewProps {
  /** "Fırsat geldi" and its time. */
  type: string;
  time: { label: string; iso: string };
  onClose: () => void;
  closeLabel: string;
  /** Product image (120 px) or a tile. */
  media: ReactNode;
  mode?: ReactNode;
  title: string;
  /** One muted line: category · own store and day · stores. */
  sub?: string;
  body: string;
  /** Three key values for the type; `highlight` = a saving (savings-subtle). */
  facts?: readonly { label: string; value: string; highlight?: boolean }[];
  /** The 14-day cheapest-price chart with its heading, where it applies. */
  chart?: ReactNode;
  /** The check time line (or where to manage it). */
  checked?: ReactNode;
  actions?: ReactNode;
}

/**
 * The bell preview (§5.29): opens to the left of the panel for the clicked item; product, mode,
 * message, three fact tiles (no good/bad colouring unless a saving), the 14-day chart, check time,
 * actions. The coral action appears only here.
 */
export function NotificationPreview({ type, time, onClose, closeLabel, media, mode, title, sub, body, facts = [], chart, checked, actions }: NotificationPreviewProps) {
  return (
    <section aria-label={title} aria-live="polite" className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-text-muted">
          <span className="font-semibold">{type}</span> {SEPARATOR} <time dateTime={time.iso}>{time.label}</time>
        </span>
        <button type="button" onClick={onClose} aria-label={closeLabel} className={cn("flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill text-text hover:bg-surface-alt", focusRing)}>
          <Icon icon={X} />
        </button>
      </div>
      <div className="flex items-start gap-4">
        {media}
        <div className="flex min-w-0 flex-col gap-1">
          {mode}
          <h3 className="text-h3 text-text">{title}</h3>
          {sub && <span className="text-caption text-text-muted">{sub}</span>}
        </div>
      </div>
      <p className="text-body text-text">{body}</p>
      {facts.length > 0 && (
        <dl className="grid grid-cols-3 gap-2">
          {facts.map((fact) => (
            <div key={fact.label} className={cn("flex min-w-0 flex-col gap-1 rounded-md p-3", fact.highlight ? "bg-savings-subtle" : "bg-surface-alt")}>
              <dt className="text-caption text-text-muted">{fact.label}</dt>
              <dd className={cn("text-body-sm font-semibold break-words", fact.highlight ? "text-savings" : "text-text")}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {chart}
      {checked && <div className="text-caption text-text-muted">{checked}</div>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
