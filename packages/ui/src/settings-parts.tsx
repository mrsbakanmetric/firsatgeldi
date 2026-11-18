"use client";

// Settings parts (product_design_pattern.md §5.38 [DECIDED 2026-11-18]; pagedesign.md §8.9
// design v2.1), built from the §5.36 primitives:
// SettingsNav · SavedIndicator · ChoiceCards · ToggleChips · SettingRow · MaskedValue · SessionRow ·
// ChannelMatrix · ActionCard · RoleCard · PermissionGroup.
import { Check, Laptop, type LucideIcon, Monitor, Smartphone, Tablet } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { Button } from "./button";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useLinkComponent } from "./link";
import { Switch } from "./switch";

// ── SettingsNav ──────────────────────────────────────────────────────────────

export interface SettingsNavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

export interface SettingsNavProps {
  /** Accessible name ("Ayar bölümleri"). */
  label: string;
  items: readonly SettingsNavItem[];
  current: string;
}

/**
 * Desktop: a vertical list (icon + label, 44 px rows, current = primary-subtle + aria-current),
 * sticky beside the content. Below breakpoint.md: one horizontal, scrollable chip row under the
 * title, sticky at the top; the current chip scrolls into view.
 */
export function SettingsNav({ label, items, current }: SettingsNavProps) {
  const Link = useLinkComponent();
  const currentRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav
      aria-label={label}
      className={cn(
        "sticky top-(--size-header-height) z-(--z-index-sticky) -mx-4 flex gap-2 overflow-x-auto bg-background px-4 py-2",
        "md:top-6 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:rounded-lg md:border md:border-border md:bg-surface md:p-2",
      )}
    >
      {items.map((item) => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            {...(active ? { ref: currentRef } : {})}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-(--size-touch-target-min) shrink-0 items-center gap-3 text-body-sm whitespace-nowrap",
              "rounded-pill border px-3 md:rounded-md md:border-0",
              active ? "border-primary bg-primary-subtle font-semibold text-on-primary-subtle" : "border-border bg-surface font-medium text-text hover:bg-surface-alt",
              focusRing,
            )}
          >
            <Icon icon={item.icon} size="sm" className="hidden md:inline-block" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── SavedIndicator ───────────────────────────────────────────────────────────

/** "Kaydedildi · şimdi" with a check, in the section header, after an auto-save or "Kaydet". */
export function SavedIndicator({ text }: { text: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-1 text-caption font-semibold text-savings">
      <Icon icon={Check} size="sm" />
      <span>{text}</span>
    </span>
  );
}

// ── ChoiceCards ──────────────────────────────────────────────────────────────

export interface ChoiceCardOption {
  readonly value: string;
  readonly title: string;
  /** One muted line under the title. */
  readonly description?: string;
}

export interface ChoiceCardsProps {
  label: string;
  options: readonly ChoiceCardOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/** Radio cards (dot + title + one muted line), 56 px min; checked = 2 px primary border. Arrow keys move. */
export function ChoiceCards({ label, options, value, onValueChange, className }: ChoiceCardsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, step: number) => {
    const next = (from + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onValueChange(option.value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2 md:auto-cols-fr md:grid-flow-col", className)}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              "flex min-h-(--size-touch-target-min) items-start gap-3 rounded-md bg-surface p-3 text-left",
              checked ? "border-(length:--border-width-strong) border-primary" : "border border-border",
              focusRing,
            )}
          >
            <span aria-hidden="true" className={cn("mt-1 flex size-(--size-icon-sm) shrink-0 items-center justify-center rounded-pill border-(length:--border-width-strong)", checked ? "border-primary" : "border-border")}>
              {checked && <span className="size-2 rounded-pill bg-primary" />}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-body-sm font-semibold text-text">{option.title}</span>
              {option.description && <span className="text-caption text-text-muted">{option.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── SettingRow ───────────────────────────────────────────────────────────────

export interface SettingRowProps {
  icon?: LucideIcon;
  /** Caption above the value ("E-posta"). */
  label: string;
  /** The value, masked where personal. */
  value: ReactNode;
  /** One muted note. */
  note?: ReactNode;
  /** Actions on the same row (no idle rows). */
  actions?: ReactNode;
  className?: string;
}

/** Label (caption) · value · one muted note · actions on the same row; stacks below breakpoint.md. */
export function SettingRow({ icon, label, value, note, actions, className }: SettingRowProps) {
  return (
    <div className={cn("flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-4", className)}>
      {icon && (
        <span aria-hidden="true" className="hidden size-10 shrink-0 items-center justify-center rounded-md bg-surface-alt text-text-muted md:flex">
          <Icon icon={icon} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption font-semibold text-text-muted">{label}</span>
        <span className="text-body font-semibold break-words text-text">{value}</span>
        {note && <span className="text-caption text-text-muted">{note}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── MaskedValue ──────────────────────────────────────────────────────────────

export interface MaskedValueProps extends Omit<SettingRowProps, "value" | "actions"> {
  masked: string;
  /** The full value while it is shown, else null. */
  revealed: string | null;
  /** Seconds left before it masks itself (the countdown pill, "0:52"). */
  countdown: string;
  onShow: () => void;
  onHide: () => void;
  showLabel: string;
  hideLabel: string;
  /** Loading while re-authentication or the read runs. */
  showing?: boolean;
  /** Other actions after "Göster" ("Değiştir"). */
  extraActions?: ReactNode;
}

/**
 * Masked text + "Göster"; after re-authentication the full value shows with a countdown pill
 * (warning-subtle, announced politely) and "Gizle", then masks itself again. Every reveal is logged
 * by the server.
 */
export function MaskedValue({ masked, revealed, countdown, onShow, onHide, showLabel, hideLabel, showing = false, extraActions, ...row }: MaskedValueProps) {
  return (
    <SettingRow
      {...row}
      value={revealed ?? masked}
      actions={
        <>
          {revealed ? (
            <>
              <span aria-live="polite" className="rounded-pill bg-warning-subtle px-2 py-1 text-caption font-semibold text-on-warning-subtle tabular-nums">
                {countdown}
              </span>
              <Button variant="secondary" size="compact" onClick={onHide}>
                {hideLabel}
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="compact" onClick={onShow} loading={showing}>
              {showLabel}
            </Button>
          )}
          {extraActions}
        </>
      }
    />
  );
}

// ── SessionRow ───────────────────────────────────────────────────────────────

const DEVICE_ICONS: Record<"DESKTOP" | "PHONE" | "TABLET" | "UNKNOWN", LucideIcon> = { DESKTOP: Laptop, PHONE: Smartphone, TABLET: Tablet, UNKNOWN: Monitor };

export interface SessionRowProps {
  device: "DESKTOP" | "PHONE" | "TABLET" | "UNKNOWN";
  /** "Chrome · Windows". */
  title: string;
  /** "Bilgisayar" / "Telefon". */
  subtitle: string;
  /** "Şu an etkin" / "2 gün önce". */
  when: string;
  /** "Bu cihaz" pill, or the "Çıkış yap" action; nothing on the sign-ins list. */
  end?: ReactNode;
}

/** Device icon · device and browser · device type · last use · "Bu cihaz" or "Çıkış yap". No location. */
export function SessionRow({ device, title, subtitle, when, end }: SessionRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-alt text-text-muted">
        <Icon icon={DEVICE_ICONS[device]} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-semibold text-text">{title}</span>
        <span className="text-caption text-text-muted">{subtitle}</span>
      </div>
      <span className="shrink-0 text-caption text-text-muted">{when}</span>
      {end && <div className="flex shrink-0 items-center">{end}</div>}
    </div>
  );
}

// ── ToggleChips ──────────────────────────────────────────────────────────────

export interface ToggleChipOption {
  readonly value: string;
  readonly label: string;
}

export interface ToggleChipsProps {
  /** Accessible name of the group ("Saat dilimleri"). */
  label: string;
  options: readonly ToggleChipOption[];
  /** The pressed values. */
  value: readonly string[];
  /** The exclusive "all" chip ("Her zaman"): pressing it clears the others, clearing the others presses it. */
  allValue: string;
  onValueChange: (value: string[]) => void;
}

/** Multi-select pills with aria-pressed, 44 px; pressed = primary-subtle + primary border (§5.38). */
export function ToggleChips({ label, options, value, allValue, onValueChange }: ToggleChipsProps) {
  const toggle = (option: string) => {
    if (option === allValue) return onValueChange([allValue]);
    const rest = value.filter((entry) => entry !== allValue);
    const next = rest.includes(option) ? rest.filter((entry) => entry !== option) : [...rest, option];
    onValueChange(next.length === 0 ? [allValue] : options.map((entry) => entry.value).filter((entry) => next.includes(entry)));
  };
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const pressed = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => toggle(option.value)}
            className={cn(
              "inline-flex min-h-(--size-touch-target-min) items-center gap-1 rounded-pill border px-4 text-body-sm",
              pressed ? "border-primary bg-primary-subtle font-semibold text-on-primary-subtle" : "border-border bg-surface font-medium text-text hover:bg-surface-alt",
              focusRing,
            )}
          >
            {pressed && <Icon icon={Check} size="sm" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── ChannelMatrix ────────────────────────────────────────────────────────────

export interface ChannelMatrixChannel {
  readonly id: string;
  /** Column heading ("Uygulama içi"). */
  readonly label: string;
}

export interface ChannelMatrixRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** A group heading shown above this row ("Yönetim bildirimleri"). */
  readonly heading?: string;
  /** Channel id → on. */
  readonly values: Readonly<Record<string, boolean>>;
  /** "kapatılamaz": the switches are locked on. */
  readonly lockedLabel?: string;
}

export interface ChannelMatrixProps {
  /** Accessible name of the table ("Bildirim türleri"). */
  label: string;
  /** First column heading ("Bildirim"). */
  rowHeader: string;
  channels: readonly ChannelMatrixChannel[];
  rows: readonly ChannelMatrixRow[];
  /** The switch's accessible name ("Fırsat geldi · e-posta"). */
  switchLabel: (row: ChannelMatrixRow, channel: ChannelMatrixChannel) => string;
  onToggle: (rowId: string, channelId: string, value: boolean) => void;
}

/** Notification types × channels with a Switch per cell; optional group headings; locked rows (§5.38). */
export function ChannelMatrix({ label, rowHeader, channels, rows, switchLabel, onToggle }: ChannelMatrixProps) {
  const row = "flex items-center gap-2 px-5";
  const cell = "flex w-20 shrink-0 justify-center md:w-28";
  return (
    <div role="table" aria-label={label} className="overflow-hidden rounded-lg border border-border bg-surface">
      <div role="rowgroup">
        <div role="row" className={cn(row, "border-b border-divider bg-surface-alt py-2 text-caption font-semibold text-text-muted")}>
          <span role="columnheader" className="min-w-0 flex-1">
            {rowHeader}
          </span>
          {channels.map((channel) => (
            <span key={channel.id} role="columnheader" className={cn(cell, "text-center")}>
              {channel.label}
            </span>
          ))}
        </div>
      </div>
      <div role="rowgroup" className="flex flex-col divide-y divide-divider">
        {rows.map((entry) => (
          <Fragment key={entry.id}>
            {entry.heading && (
              <div role="row" className="bg-surface-alt px-5 py-2">
                <span role="cell" className="text-caption font-semibold text-text-muted uppercase">
                  {entry.heading}
                </span>
              </div>
            )}
            <div role="row" className={cn(row, "py-2")}>
              <div role="cell" className="flex min-w-0 flex-1 flex-col py-1">
                <span className="text-body-sm font-semibold text-text">{entry.lockedLabel ? [entry.title, entry.lockedLabel].join(" · ") : entry.title}</span>
                <span className="text-caption text-text-muted">{entry.description}</span>
              </div>
              {channels.map((channel) => (
                <div key={channel.id} role="cell" className={cell}>
                  <Switch
                    hideLabel
                    label={switchLabel(entry, channel)}
                    checked={entry.values[channel.id] ?? false}
                    {...(entry.lockedLabel ? { lockedReason: entry.lockedLabel } : {})}
                    onCheckedChange={(value) => onToggle(entry.id, channel.id, value)}
                  />
                </div>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ── ActionCard ───────────────────────────────────────────────────────────────

export interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  /** One line (or the state of the action: "Dosyan hazır · …"). */
  text: ReactNode;
  /** The one action at the bottom. */
  action: ReactNode;
  /** danger: delete (danger tile and outline button). */
  tone?: "normal" | "danger";
}

/** Icon tile · title · one line · one action at the bottom (§5.38). */
export function ActionCard({ icon, title, text, action, tone = "normal" }: ActionCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <span aria-hidden="true" className={cn("flex size-10 items-center justify-center rounded-md", tone === "danger" ? "bg-danger-subtle text-danger" : "bg-primary-subtle text-on-primary-subtle")}>
        <Icon icon={icon} />
      </span>
      <h3 className="text-body font-semibold text-text">{title}</h3>
      <div className="text-body-sm text-text-muted">{text}</div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">{action}</div>
    </div>
  );
}

// ── RoleCard · PermissionGroup ───────────────────────────────────────────────

export interface RoleCardProps {
  icon: LucideIcon;
  /** "Uygulama Yöneticisi". */
  title: string;
  /** One line ("Her şeyi görür ve yönetir · …"). */
  text: string;
  /** Link to Roles and Permissions. */
  link?: { href: string; label: string };
}

/** The role on a hero-surface tile + one line + a link to Roles and Permissions; read-only (§5.38). */
export function RoleCard({ icon, title, text, link }: RoleCardProps) {
  const Link = useLinkComponent();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 md:flex-row md:items-center md:gap-4">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-md bg-hero-surface text-on-hero-surface">
        <Icon icon={icon} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-h3 text-text">{title}</span>
        <span className="text-body-sm text-text-muted">{text}</span>
      </div>
      {link && (
        <Link href={link.href} className={cn("text-body-sm font-semibold text-primary underline underline-offset-4", focusRing)}>
          {link.label}
        </Link>
      )}
    </div>
  );
}

export interface PermissionGroupProps {
  title: string;
  /** "7 / 7 yetki". */
  count: string;
  /** Official permission keys (database.md §4), shown as they are. */
  keys: readonly string[];
}

/** A group of permission keys in monospace chips with its count; read-only (§5.38). */
export function PermissionGroup({ title, count, keys }: PermissionGroupProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-body-sm font-semibold text-text">{title}</h3>
        <span className="shrink-0 text-caption text-text-muted tabular-nums">{count}</span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {keys.map((key) => (
          <li key={key}>
            <code className="inline-flex rounded-sm bg-surface-alt px-2 py-1 text-caption break-all text-text">{key}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
