// ProductImage (product_design_pattern.md §5.30): mandatory wherever a product
// is shown. A surface-alt square, radius.md, contained image; without an image
// the category illustration fills the same slot (never an empty box).
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

/** sm = compact lists and side columns · md = main lists · fill = previews (fills its column). */
export type ProductImageSize = "sm" | "md" | "fill";

const SIZE_CLASSES: Record<ProductImageSize, string> = {
  sm: "size-(--size-thumb-sm)",
  md: "size-(--size-thumb-md)",
  fill: "aspect-square w-full",
};

export interface ProductImageProps {
  /** Image URL (catalogue image variant), or null when the catalogue has none. */
  src: string | null;
  /** Product name; omit when the name is visible next to the image, so it is not read twice. */
  alt?: string;
  size?: ProductImageSize;
  /** Category illustration used when there is no image. */
  fallbackIcon: LucideIcon;
  className?: string;
}

/** Decorative image: the product name is read from the text next to it. */
const NO_TEXT = "";

export function ProductImage({ src, alt, size = "md", fallbackIcon, className }: ProductImageProps) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-alt text-text-muted", SIZE_CLASSES[size], className)}>
      {src ? (
        // Catalogue images are already resized variants served from the API (architecture.md §11a).
        <img src={src} alt={alt ?? NO_TEXT} aria-hidden={alt ? undefined : true} loading="lazy" decoding="async" className="size-full object-contain" />
      ) : (
        <Icon icon={fallbackIcon} size="lg" {...(alt ? { label: alt } : {})} />
      )}
    </span>
  );
}
