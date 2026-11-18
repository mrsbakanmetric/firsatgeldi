// GuestProductCard (pagedesign.md §5 [DECIDED 2026-11-18], product_design_pattern.md §5.30):
// "Seçtiğin ürün seni bekliyor" — the product a guest marked before signing in, so the
// way back to the confirm step is visible. Image, name, variant; read as a status.
import type { LucideIcon } from "lucide-react";
import { ProductImage } from "./product-image";

export interface GuestProductCardProps {
  title: string;
  name: string;
  /** "Flash Print" — the variant line, when known. */
  variant?: string | null;
  imageSrc: string | null;
  fallbackIcon: LucideIcon;
}

export function GuestProductCard({ title, name, variant, imageSrc, fallbackIcon }: GuestProductCardProps) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <ProductImage src={imageSrc} size="sm" fallbackIcon={fallbackIcon} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-body-sm font-bold text-text">{title}</span>
        <span className="truncate text-caption font-medium text-text-muted">{variant ? `${name} · ${variant}` : name}</span>
      </span>
    </div>
  );
}
