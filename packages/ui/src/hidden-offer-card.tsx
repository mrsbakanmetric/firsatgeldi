"use client";

// HiddenOfferCard + "Göster" gate (product_design_pattern.md §5.2): before
// reveal a lock and "satıcı gizli" with what may show (price, saving, stock,
// shipping, delivery, warranty, last check) — never the seller or the platform.
// After reveal, in place: seller (with rating), platform as a neutral label,
// a primary "go to listing" and "Gizle".
// Layout "detail" (Product Detail v2, pagedesign.md §8.3): every action on the top row —
// rank (lock) or seller + platform · price + difference · Göster (revealed: Mağazaya git +
// Gizle); the information lines under the label; the caller's blocks (store ratings after
// Göster, the one-line summary, notes) follow as children. A revealed card has a primary border.
import { ExternalLink, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface RevealedSeller {
  sellerName: string;
  /** "Satıcı puanı 4,8 / 5"; null when unknown. */
  rating: string | null;
  platformName: string;
  goLabel: string;
  /** Goes through the API (`POST /offers/:ref/go`, logged), which returns the outbound link. */
  onGo: () => void;
  going?: boolean;
  hideLabel: string;
  onHide: () => void;
}

export interface HiddenOfferCardProps {
  /** "En ucuz satıcı · satıcı gizli" — rank only, never the seller or the platform. */
  hiddenLabel: string;
  price: ReactNode;
  saving?: ReactNode;
  /** Stock, shipping, delivery, warranty — one worded line. */
  details?: string;
  freshness?: ReactNode;
  revealLabel: string;
  onReveal: () => void;
  revealing?: boolean;
  /** Reserved slot for the remaining-allowance indicator and cost note (§5.10). */
  allowance?: ReactNode;
  revealed?: RevealedSeller | null;
  /** compact = Search and Add teaser (default) · detail = Product Detail offer card. */
  layout?: "compact" | "detail";
  /** Detail layout: blocks under the top row. */
  children?: ReactNode;
  className?: string;
}

export function HiddenOfferCard(props: HiddenOfferCardProps) {
  if (props.layout === "detail") return <DetailCard {...props} />;
  const { hiddenLabel, price, saving, details, freshness, revealLabel, onReveal, revealing = false, allowance, revealed, className } = props;
  return (
    <div className={cn("flex flex-col gap-2 rounded-md border border-border bg-surface p-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          {revealed ? (
            <span className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
              <span className="font-semibold text-text">{revealed.sellerName}</span>
              {revealed.rating && <span className="text-caption text-text-muted">{revealed.rating}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-caption text-text-muted">
              <Icon icon={Lock} size="sm" />
              <span>{hiddenLabel}</span>
            </span>
          )}
          {revealed && <span className="self-start rounded-pill bg-surface-alt px-2 py-1 text-caption text-text">{revealed.platformName}</span>}
          <span className="flex flex-wrap items-baseline gap-2">
            {price}
            {saving}
          </span>
        </div>
        {!revealed && (
          <div className="flex flex-col items-end gap-1">
            <Button variant="secondary" onClick={onReveal} loading={revealing}>
              {revealLabel}
            </Button>
            {allowance}
          </div>
        )}
      </div>
      {details && <p className="text-caption text-text-muted">{details}</p>}
      {freshness}
      {revealed && (
        <div className="flex flex-wrap gap-2">
          <Button icon={ExternalLink} onClick={revealed.onGo} loading={revealed.going ?? false}>
            {revealed.goLabel}
          </Button>
          <Button variant="ghost" onClick={revealed.onHide}>
            {revealed.hideLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailCard({ hiddenLabel, price, saving, details, freshness, revealLabel, onReveal, revealing = false, allowance, revealed, children, className }: HiddenOfferCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 rounded-lg bg-surface p-4",
        revealed ? "border-(length:--border-width-strong) border-primary" : "border border-border",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 md:flex-nowrap">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {revealed ? (
            <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-text">
              {revealed.sellerName}
              <span className="rounded-sm bg-surface-alt px-2 text-caption font-medium text-text">{revealed.platformName}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-body font-semibold text-text">
              <Icon icon={Lock} size="sm" className="text-text-muted" />
              {hiddenLabel}
            </span>
          )}
          {details && <span className="text-caption text-text-muted">{details}</span>}
          {freshness}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          {price}
          {saving}
        </div>
        <div className="flex basis-full flex-wrap items-center justify-end gap-2 md:basis-auto md:flex-col md:items-end">
          {revealed ? (
            <>
              <Button icon={ExternalLink} onClick={revealed.onGo} loading={revealed.going ?? false}>
                {revealed.goLabel}
              </Button>
              <Button variant="ghost" size="compact" onClick={revealed.onHide}>
                {revealed.hideLabel}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onReveal} loading={revealing}>
                {revealLabel}
              </Button>
              {allowance}
            </>
          )}
        </div>
      </div>
      {children}
    </article>
  );
}
