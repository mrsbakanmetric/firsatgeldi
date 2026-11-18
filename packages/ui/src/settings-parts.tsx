"use client";

// Settings parts (product_design_pattern.md §5.38 [DECIDED 2026-11-18]; pagedesign.md §8.9
// design v2.1), built from the §5.36 primitives:
// SettingsNav · SavedIndicator · ChoiceCards · SettingRow · MaskedValue · SessionRow.
import { Check, Laptop, type LucideIcon, Monitor, Smartphone, Tablet } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "./button";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useLinkComponent } from "./link";

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
