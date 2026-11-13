// PageTemplate (pagedesign.md §3, product_design_pattern.md §5.22): every
// screen picks one of five templates; regions always appear in this order and
// optional ones are skipped, never reordered:
//   title (+ badge, caption) · page actions · summary · toolbar · content · side column · footnote
// Below breakpoint.md everything is one column; page actions go full width
// after the content (canvas 0, phone shell).
import type { ReactNode } from "react";
import { cn } from "./cn";

export type PageTemplateKind = "list" | "detail" | "flow" | "summary" | "settings";

export interface PageTemplateProps {
  kind: PageTemplateKind;
  title: string;
  /** Next to the title, e.g. the plan badge. */
  badge?: ReactNode;
  /** One muted line under the title: freshness, counts, reset times. */
  caption?: ReactNode;
  /** At most one primary + one secondary. */
  actions?: ReactNode;
  /** Stat tiles or one hero block. */
  summary?: ReactNode;
  /** Search, category filter, filters with counts, sort, period. */
  toolbar?: ReactNode;
  /** Settings: the section menu (left column). */
  sectionMenu?: ReactNode;
  /** List / Summary / Detail: side column · Flow: the confirm panel. */
  side?: ReactNode;
  /** Accessible name of the side column. */
  sideLabel?: string;
  /** Detail: full-width sections under the two-column top. */
  sections?: ReactNode;
  footnote?: ReactNode;
  /** The content region, where the five states are drawn. */
  children: ReactNode;
  className?: string;
}

const SIDE_WIDTH_CLASSES: Record<PageTemplateKind, string> = {
  list: "md:w-(--size-side-column-width)",
  detail: "md:w-(--size-side-column-width)",
  summary: "md:w-(--size-side-column-width)",
  flow: "md:w-(--size-side-panel-width)",
  settings: "md:w-(--size-side-column-width)",
};

export function PageTemplate({
  kind,
  title,
  badge,
  caption,
  actions,
  summary,
  toolbar,
  sectionMenu,
  side,
  sideLabel,
  sections,
  footnote,
  children,
  className,
}: PageTemplateProps) {
  const content = (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}
      {children}
    </div>
  );

  return (
    // One copy of every region: on phones the actions move to the end (order-last),
    // from breakpoint.md they sit on the title row and every other region wraps to a full row.
    <div
      data-template={kind}
      className={cn("mx-auto flex w-full max-w-(--size-content-max-width) flex-col gap-6 px-4 py-6 md:flex-row md:flex-wrap md:items-start md:px-6 md:py-8", className)}
    >
      <div className="flex min-w-0 flex-col gap-1 md:flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1 text-text">{title}</h1>
          {badge}
        </div>
        {caption && <p className="text-body-sm text-text-muted">{caption}</p>}
      </div>

      {actions && <div className="order-last flex flex-col gap-3 md:order-none md:flex-row md:items-center">{actions}</div>}

      {summary && <div className="flex flex-col gap-4 md:basis-full">{summary}</div>}

      <div className="flex flex-col gap-6 md:basis-full md:flex-row md:items-start">
        {kind === "settings" && sectionMenu && <div className="md:w-(--size-section-menu-width) md:shrink-0">{sectionMenu}</div>}
        {content}
        {side && (
          <aside aria-label={sideLabel} className={cn("flex flex-col gap-4 md:shrink-0", SIDE_WIDTH_CLASSES[kind])}>
            {side}
          </aside>
        )}
      </div>

      {sections && <div className="flex flex-col gap-6 md:basis-full">{sections}</div>}

      {footnote && <p className="text-caption text-text-muted md:basis-full">{footnote}</p>}
    </div>
  );
}
