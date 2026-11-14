"use client";

// HiddenOfferCard + "Göster" gate (product_design_pattern.md §5.2): before
// reveal a lock and "satıcı gizli" with what may show (price, saving, stock,
// shipping, delivery, warranty, last check) — never the seller or the platform.
// After reveal, in place: seller (with rating), platform as a neutral label,
// a primary "go to listing" and "Gizle".
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
  className?: string;
}

export function HiddenOfferCard({ hiddenLabel, price, saving, details, freshness, revealLabel, onReveal, revealing = false, allowance, revealed, className }: HiddenOfferCardProps) {
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
