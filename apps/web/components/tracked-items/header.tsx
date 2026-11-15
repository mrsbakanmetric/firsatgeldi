"use client";

// The header of one tracked item, shared by Home's Hemen Gözat and Product Detail (design v2:
// "Header card = the Home Hemen Gözat header", pagedesign.md §8.3): image 120 with the status
// icon on its corner · flags, title and information lines · on the right the headline amount.
// Callers give the lines; the layout is the same on both pages.
import type { TrackedItemListItem } from "@firsatgeldi/contracts";
import type { Translator } from "@firsatgeldi/i18n";
import { ProductImage } from "@firsatgeldi/ui";
import { Package } from "lucide-react";
import type { ReactNode } from "react";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { StatusIcon } from "./parts";

export function TrackedHeader({
  t,
  item,
  children,
  aside,
}: {
  t: Translator;
  item: Pick<TrackedItemListItem, "mode" | "product">;
  /** Flags, title and lines, top to bottom. */
  children: ReactNode;
  /** The headline on the right ("En çok kazanç" + amount …). */
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 gap-4 md:gap-5">
        <span className="relative shrink-0">
          <ProductImage src={imageUrl(item.product.imageSha256)} size="lg" fallbackIcon={Package} />
          <StatusIcon t={t} mode={item.mode} />
        </span>
        <div className="flex min-w-0 flex-col gap-2">{children}</div>
      </div>
      {aside && <div className="flex shrink-0 flex-col gap-1 md:items-end">{aside}</div>}
    </div>
  );
}
