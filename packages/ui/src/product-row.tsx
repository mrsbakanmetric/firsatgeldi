"use client";

// ProductRow (pagedesign.md §5; §8.4 design v2–v3): image · status · name/line ·
// data columns · actions. The whole row opens its link (the title link is stretched
// over the row), and actions inside it — "Fırsatı gör", the ⋯ menu — sit above that
// link, so pressing them never opens the row. Columns keep the same share of the
// row on every row, so values line up down the list; below breakpoint.md the data
// columns wrap under the name. A row with a deal has a `savings` border (v4).
// Layout "priceList" (Tracked Items Row v4): the name column keeps
// size.list-name-min-width and up to two lines; the price list ("fill") shrinks first.
import type { ReactNode } from "react";
import { cn } from "./cn";
import { useLinkComponent } from "./link";

export interface ProductRowColumn {
  key: string;
  content: ReactNode;
  /** Share of the row from breakpoint.md. */
  width: "1/6" | "1/5" | "1/4" | "1/3" | "fill";
  /** Below breakpoint.md the column takes a full line (e.g. the state). */
  phoneFull?: boolean;
}

export interface ProductRowProps {
  href: string;
  image: ReactNode;
  flags?: ReactNode;
  title: string;
  line?: ReactNode;
  columns?: readonly ProductRowColumn[];
  /** Buttons and menus that must not open the row (⋯, "Fırsatı gör"). */
  actions?: ReactNode;
  /** deal = a current deal (savings border). */
  tone?: "default" | "deal";
  /**
   * columns = name grows (default); priceList = the name keeps size.list-name-min-width, a "fill"
   * column shrinks first; card = a card of the Tracked Items grid (design v5): header (image ·
   * name · flags · line · actions top-right), the columns stacked at full width, then `footer`.
   */
  layout?: "columns" | "priceList" | "card";
  /** Card layout: the strip at the bottom of the card (styled by the caller). */
  footer?: ReactNode;
  /** Ended tracking: dimmed. */
  dimmed?: boolean;
  className?: string;
}

const WIDTH_CLASSES: Record<ProductRowColumn["width"], string> = {
  "1/6": "md:w-1/6",
  "1/5": "md:w-1/5",
  "1/4": "md:w-1/4",
  "1/3": "md:w-1/3",
  // Takes the rest of the row and is what shrinks first.
  fill: "md:min-w-0",
};

export function ProductRow({ href, image, flags, title, line, columns = [], actions, tone = "default", layout = "columns", footer, dimmed = false, className }: ProductRowProps) {
  const Link = useLinkComponent();
  const priceList = layout === "priceList";
  if (layout === "card") {
    return (
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-lg border has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
          tone === "deal" ? "border-(length:--border-width-strong) border-savings bg-surface" : "border-border bg-surface hover:border-text-muted",
          className,
        )}
      >
        <div className={cn("flex items-start gap-3 p-3", dimmed && "opacity-(--component-button-disabled-opacity)")}>
          {image}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            {/* The stretched link: its ::after covers the whole card. */}
            <Link href={href} className="line-clamp-2 text-body-sm font-semibold text-text outline-none after:absolute after:inset-0 after:rounded-lg">
              {title}
            </Link>
            {flags && <span className="flex flex-wrap gap-1">{flags}</span>}
            {line && <span className="text-caption text-text-muted">{line}</span>}
          </span>
          {actions && <span className="relative z-(--z-index-raised) flex shrink-0 items-center gap-2">{actions}</span>}
        </div>
        {/* The body takes the spare height, so the footer always closes the card. */}
        <div className={cn("flex flex-1 flex-col gap-2 px-3 pb-3", dimmed && "opacity-(--component-button-disabled-opacity)")}>
          {columns.map((column) => (
            <div key={column.key} className="flex min-w-0 flex-col gap-1">
              {column.content}
            </div>
          ))}
        </div>
        {footer}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border p-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary md:flex-row md:items-center md:gap-4",
        tone === "deal" ? "border-(length:--border-width-strong) border-savings bg-surface" : "border-border bg-surface hover:border-text-muted",
        className,
      )}
    >
      <span
        className={cn(
          "flex min-w-0 gap-3",
          priceList ? "items-start md:shrink-0 md:grow-0" : "items-center md:flex-1",
          dimmed && "opacity-(--component-button-disabled-opacity)",
        )}
      >
        {image}
        {/* Price list layout: the name keeps size.list-name-min-width (220 px) and two lines; the price list shrinks first. */}
        <span className={cn("flex min-w-0 flex-1 flex-col gap-1", priceList && "md:w-(--size-list-name-min-width) md:flex-none")}>
          {flags && <span className="flex flex-wrap gap-1">{flags}</span>}
          {/* The stretched link: its ::after covers the whole row. */}
          <Link
            href={href}
            className={cn("text-body-sm font-semibold text-text outline-none after:absolute after:inset-0 after:rounded-lg", priceList ? "line-clamp-2" : "truncate")}
          >
            {title}
          </Link>
          {line && (priceList ? <span className="text-caption text-text-muted">{line}</span> : <span className="truncate text-caption text-text-muted">{line}</span>)}
        </span>
      </span>
      {columns.length > 0 && (
        <span className={cn("flex flex-wrap gap-x-4 gap-y-2 md:contents", dimmed && "opacity-(--component-button-disabled-opacity)")}>
          {columns.map((column) => (
            <span
              key={column.key}
              className={cn("flex min-w-0 flex-1 flex-col gap-1", column.width === "fill" ? "md:basis-0" : "md:flex-none md:shrink-0", column.phoneFull && "basis-full", WIDTH_CLASSES[column.width])}
            >
              {column.content}
            </span>
          ))}
        </span>
      )}
      {actions && <span className="relative z-(--z-index-raised) flex shrink-0 items-center gap-2 self-end md:self-center">{actions}</span>}
    </div>
  );
}
