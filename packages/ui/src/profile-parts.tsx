"use client";

// Profile parts (product_design_pattern.md §5.34 person row, §5.39 [DECIDED 2026-11-18];
// pagedesign.md §8.9a design v2.1): ProfileHeader · PersonRow · Tabs · SharedDealRow ·
// VisibilityCard · ViewAsPreview. Built from the §5.36 primitives.
import { BadgeCheck, Lock } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";
import { Avatar } from "./avatar";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { useLinkComponent } from "./link";

// ── ProfileHeader ────────────────────────────────────────────────────────────

export interface ProfileHeaderProps {
  avatar: { initials: string; src?: string | null };
  /** The h1: "@sinan.b", or "Profilin hazır değil" without a username. */
  title: string;
  /** "Fırsat Avcısı" (badge on primary-subtle with a check). */
  badge?: string;
  /** Privacy pill (lock + "Takipçilerime"). */
  privacy?: string;
  /** "**3** takipçi" items. */
  counts?: readonly { value: string; label: string }[];
  /** "Ekim 2026'dan beri üye". */
  since: string;
  /** On the right; stacked full width on phones. */
  actions?: ReactNode;
}

/** Avatar 96 (72 on phones), @username, badge and privacy pill, counts, member since, actions (§5.39). */
export function ProfileHeader({ avatar, title, badge, privacy, counts = [], since, actions }: ProfileHeaderProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:flex-row md:items-center md:gap-5">
      <Avatar initials={avatar.initials} {...(avatar.src ? { src: avatar.src } : {})} size="lg" className="size-(--component-avatar-size-lg-compact) text-h2 md:size-(--component-avatar-size-lg) md:text-h1" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h1 break-all text-text">{title}</h1>
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-primary-subtle px-2 py-1 text-caption font-semibold text-on-primary-subtle">
              <Icon icon={BadgeCheck} size="sm" />
              {badge}
            </span>
          )}
          {privacy && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface-alt px-2 py-1 text-caption font-semibold text-text">
              <Icon icon={Lock} size="sm" />
              {privacy}
            </span>
          )}
        </div>
        {counts.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-text-muted">
            {counts.map((count) => (
              <li key={count.label}>
                <strong className="font-semibold text-text tabular-nums">{count.value}</strong> {count.label}
              </li>
            ))}
          </ul>
        )}
        <span className="text-caption text-text-muted">{since}</span>
      </div>
      {actions && <div className="flex flex-col gap-2 md:shrink-0 md:items-end">{actions}</div>}
    </section>
  );
}

// ── PersonRow ────────────────────────────────────────────────────────────────

export interface PersonRowProps {
  avatar: { initials: string; src?: string | null };
  /** Shown as "@username" (plain text until other profiles exist). */
  username: string;
  /** One muted line: what the person shares, or that they do not. */
  meta?: string;
  actions?: ReactNode;
}

/** Avatar 40 · @username · one muted line · actions (§5.34). Never a real name. */
export function PersonRow({ avatar, username, meta, actions }: PersonRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3 md:flex-nowrap">
      <Avatar initials={avatar.initials} {...(avatar.src ? { src: avatar.src } : {})} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-semibold text-text">{["@", username].join("")}</span>
        {meta && <span className="truncate text-caption text-text-muted">{meta}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export interface TabsProps<T extends string> {
  /** Accessible name of the tab list. */
  label: string;
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Prefix of the tab and panel ids: the panel is `${idBase}-panel-${id}`. */
  idBase: string;
}

export const tabPanelId = (idBase: string, id: string) => `${idBase}-panel-${id}`;
export const tabId = (idBase: string, id: string) => `${idBase}-tab-${id}`;

/** Underlined page tabs (role tablist), 48 px; current = primary text + 2 px underline; phones scroll (§5.39). */
export function Tabs<T extends string>({ label, tabs, value, onChange, idBase }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const target = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + step + tabs.length) % tabs.length;
    if (step === 0 && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const tab = tabs[target];
    if (!tab) return;
    onChange(tab.id);
    refs.current[target]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={tabId(idBase, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(idBase, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "-mb-px flex h-12 shrink-0 items-center border-b-(length:--border-width-strong) px-4 text-body-sm whitespace-nowrap",
              selected ? "border-primary font-bold text-primary" : "border-transparent font-medium text-text-muted hover:text-text",
              focusRing,
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── SharedDealRow ────────────────────────────────────────────────────────────

export type SharedDealTone = "ok" | "wait" | "muted";

const TONE_CLASSES: Record<SharedDealTone, string> = {
  ok: "bg-primary-subtle text-on-primary-subtle",
  wait: "bg-warning-subtle text-on-warning-subtle",
  muted: "bg-surface-alt text-text-muted",
};

export interface SharedDealRowProps {
  /** The product image (`ProductImage`, 48). */
  image: ReactNode;
  name: string;
  category: string;
  /** "25.499 TL". */
  price: string;
  /** With the check time ("Önceki en ucuzdan 498 TL az · 1 saat önce"). */
  note: string;
  status: { label: string; tone: SharedDealTone };
}

/** Image 48 · name + category · price with its check time · status pill. Never a seller, store or link (§5.39). */
export function SharedDealRow({ image, name, category, price, note, status }: SharedDealRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3 md:flex-nowrap">
      {image}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-semibold text-text">{name}</span>
        <span className="truncate text-caption text-text-muted">{category}</span>
      </div>
      <div className="flex min-w-0 flex-col md:items-end">
        <span className="text-body-sm font-semibold text-text tabular-nums">{price}</span>
        <span className="text-caption text-text-muted">{note}</span>
      </div>
      <span className={cn("shrink-0 rounded-pill px-2 py-1 text-caption font-semibold", TONE_CLASSES[status.tone])}>{status.label}</span>
    </div>
  );
}

// ── VisibilityCard ───────────────────────────────────────────────────────────

export interface VisibilityCardProps {
  /** "Neyi kim görüyor?". */
  title: string;
  rows: readonly { label: string; audience: string; shared: boolean }[];
  link: { href: string; label: string };
}

/** One row per kind of data with its audience pill (shared = primary-subtle, private = surface-alt); read-only (§5.39). */
export function VisibilityCard({ title, rows, link }: VisibilityCardProps) {
  const Link = useLinkComponent();
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-body font-semibold text-text">{title}</h2>
      <dl className="flex flex-col divide-y divide-divider">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-body-sm text-text">{row.label}</dt>
            <dd className={cn("shrink-0 rounded-pill px-2 py-1 text-caption font-semibold", row.shared ? "bg-primary-subtle text-on-primary-subtle" : "bg-surface-alt text-text-muted")}>{row.audience}</dd>
          </div>
        ))}
      </dl>
      <Link href={link.href} className={cn("self-start text-body-sm font-semibold text-primary underline underline-offset-4", focusRing)}>
        {link.label}
      </Link>
    </section>
  );
}

// ── ViewAsPreview ────────────────────────────────────────────────────────────

export interface ViewAsPreviewProps<T extends string> {
  /** "Başkaları nasıl görüyor?". */
  title: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** One muted line under the choice. */
  note: string;
  className?: string;
}

/** Radio buttons Ben · Bir takipçi (· Takip etmeyen biri); choosing one re-renders the page as that person sees it (§5.39). */
export function ViewAsPreview<T extends string>({ title, options, value, onChange, note, className }: ViewAsPreviewProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };
  return (
    <section className={cn("flex flex-col gap-3 rounded-lg border border-border bg-surface p-5", className)}>
      <h2 className="text-body font-semibold text-text">{title}</h2>
      <div role="radiogroup" aria-label={title} className="grid auto-cols-fr grid-flow-col gap-2">
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
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => move(event, index)}
              className={cn(
                "min-h-(--size-touch-target-min) rounded-md bg-surface px-2 text-body-sm text-text",
                checked ? "border-(length:--border-width-strong) border-primary font-bold" : "border border-border font-medium",
                focusRing,
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-caption text-text-muted">{note}</p>
    </section>
  );
}
