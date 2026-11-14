"use client";

// ProductRow (pagedesign.md §5; §8.4 design v2): image · flags/name/line · data
// columns. The whole row is one link (no separate "Detay" button). Columns keep
// the same share of the row on every row, so values line up down the list;
// below breakpoint.md the data columns wrap under the name.
import type { ReactNode } from "react";
import { cn, focusRing } from "./cn";
import { useLinkComponent } from "./link";

export interface ProductRowColumn {
  key: string;
  content: ReactNode;
  /** Share of the row from breakpoint.md. */
  width: "1/6" | "1/5" | "1/4";
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
  /** Ended tracking: dimmed. */
  dimmed?: boolean;
  className?: string;
}

const WIDTH_CLASSES: Record<ProductRowColumn["width"], string> = {
  "1/6": "md:w-1/6",
  "1/5": "md:w-1/5",
  "1/4": "md:w-1/4",
};

export function ProductRow({ href, image, flags, title, line, columns = [], dimmed = false, className }: ProductRowProps) {
  const Link = useLinkComponent();
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 hover:border-text-muted md:flex-row md:items-center md:gap-4",
        dimmed && "opacity-(--component-button-disabled-opacity)",
        focusRing,
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-3 md:flex-1">
        {image}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {flags && <span className="flex flex-wrap gap-1">{flags}</span>}
          <span className="truncate text-body-sm font-semibold text-text">{title}</span>
          {line && <span className="truncate text-caption text-text-muted">{line}</span>}
        </span>
      </span>
      {columns.length > 0 && (
        <span className="flex flex-wrap gap-x-4 gap-y-2 md:contents">
          {columns.map((column) => (
            <span key={column.key} className={cn("flex min-w-0 flex-1 flex-col gap-1 md:flex-none md:shrink-0", column.phoneFull && "basis-full", WIDTH_CLASSES[column.width])}>
              {column.content}
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
