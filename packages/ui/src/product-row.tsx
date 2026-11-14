"use client";

// ProductRow (pagedesign.md §5; §8.4 design v2–v3): image · status · name/line ·
// data columns · actions. The whole row opens its link (the title link is stretched
// over the row), and actions inside it — "Fırsatı gör", the ⋯ menu — sit above that
// link, so pressing them never opens the row. Columns keep the same share of the
// row on every row, so values line up down the list; below breakpoint.md the data
// columns wrap under the name. A row with a deal sits on `savings-subtle`.
import type { ReactNode } from "react";
import { cn } from "./cn";
import { useLinkComponent } from "./link";

export interface ProductRowColumn {
  key: string;
  content: ReactNode;
  /** Share of the row from breakpoint.md. */
  width: "1/6" | "1/5" | "1/4" | "1/3";
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
  /** deal = a current deal (savings-subtle background). */
  tone?: "default" | "deal";
  /** Ended tracking: dimmed. */
  dimmed?: boolean;
  className?: string;
}

const WIDTH_CLASSES: Record<ProductRowColumn["width"], string> = {
  "1/6": "md:w-1/6",
  "1/5": "md:w-1/5",
  "1/4": "md:w-1/4",
  "1/3": "md:w-1/3",
};

export function ProductRow({ href, image, flags, title, line, columns = [], actions, tone = "default", dimmed = false, className }: ProductRowProps) {
  const Link = useLinkComponent();
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border p-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary md:flex-row md:items-center md:gap-4",
        tone === "deal" ? "border-savings-subtle bg-savings-subtle" : "border-border bg-surface hover:border-text-muted",
        className,
      )}
    >
      <span className={cn("flex min-w-0 items-center gap-3 md:flex-1", dimmed && "opacity-(--component-button-disabled-opacity)")}>
        {image}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {flags && <span className="flex flex-wrap gap-1">{flags}</span>}
          {/* The stretched link: its ::after covers the whole row. */}
          <Link href={href} className={cn("truncate text-body-sm font-semibold text-text outline-none after:absolute after:inset-0 after:rounded-lg")}>
            {title}
          </Link>
          {line && <span className="truncate text-caption text-text-muted">{line}</span>}
        </span>
      </span>
      {columns.length > 0 && (
        <span className={cn("flex flex-wrap gap-x-4 gap-y-2 md:contents", dimmed && "opacity-(--component-button-disabled-opacity)")}>
          {columns.map((column) => (
            <span key={column.key} className={cn("flex min-w-0 flex-1 flex-col gap-1 md:flex-none md:shrink-0", column.phoneFull && "basis-full", WIDTH_CLASSES[column.width])}>
              {column.content}
            </span>
          ))}
        </span>
      )}
      {actions && <span className="relative z-(--z-index-raised) flex shrink-0 items-center gap-2 self-end md:self-center">{actions}</span>}
    </div>
  );
}
