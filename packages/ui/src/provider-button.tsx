"use client";

// ProviderButton (pagedesign.md §5 [DECIDED 2026-11-18], product_design_pattern.md §4.1):
// "Google ile devam et" / "Apple ile devam et" — full width, outlined, the provider's
// mark on the left, label centred. The mark is passed in so each provider's official
// asset can be used as its guidelines require; until those assets are added the
// canvas placeholder (the provider's initial) is shown.
import type { ReactNode } from "react";
import { cn, focusRing } from "./cn";

export interface ProviderButtonProps {
  label: string;
  /** The provider's mark (decorative; the label names the provider). */
  mark: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ProviderButton({ label, mark, onClick, loading = false, disabled = false }: ProviderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "flex min-h-(--component-button-primary-height) w-full items-center gap-3 rounded-md border border-border bg-surface px-4 text-button font-semibold text-text hover:bg-surface-alt",
        (disabled || loading) && "cursor-not-allowed opacity-(--component-button-disabled-opacity)",
        focusRing,
      )}
    >
      <span aria-hidden="true" className="flex size-(--size-icon-lg) shrink-0 items-center justify-center">
        {mark}
      </span>
      <span className="flex-1 text-center">{label}</span>
      {/* Same width as the mark, so the label stays centred on the button. */}
      <span aria-hidden="true" className="size-(--size-icon-lg) shrink-0" />
    </button>
  );
}
