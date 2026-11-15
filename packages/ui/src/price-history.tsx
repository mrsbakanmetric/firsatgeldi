"use client";

// PriceHistory (pagedesign.md §5 "PriceHistory (full chart)"; product_design_pattern.md §5.6;
// pagedesign.md §8.1 Hemen Gözat chart, design v2): a titled period with its dates; a price
// grid with labels and date labels; the price paid (solid, chart-paid) or the target
// (dotted); the cheapest price (dashed, chart-best) with every step change as a hollow point
// and its price; the gap between paid/target and the cheapest filled savings-subtle with a
// "Fark X TL" pill; direct end labels (name + value); a legend row; summary tiles under it.
// Hover or tap reads out the day and the price. Lines differ by pattern as well as colour.
// The numbers (grid, steps, summary) come from `priceChartModel` in packages/core; every
// text is given by the caller. Product Detail (design v2) adds the range choice (outside, by the
// caller), the part before tracking started drawn dimmed with a "Takip başladı" marker, and four tiles.
import { type CSSProperties, type PointerEvent, type ReactNode, useState } from "react";
import { cn } from "./cn";

/** Drawing space of the SVG (not screen pixels); the chart stretches to its slot. */
const VIEW = 100;
/** Space above the highest and below the lowest grid value (share of the height). */
const PAD = 8;
/** Line patterns (in drawing units): dashed = cheapest, dotted = target, grid = short dashes. */
const DASHED = "5 4";
const DOTTED = "1.5 3";
const GRID_DASH = "2 3";
/** End labels closer than this (share of the height) are moved apart so they never overlap. */
const MIN_LABEL_GAP = 24;

type Vars = CSSProperties & Record<`--${string}`, string>;

export interface PriceHistoryEnd {
  /** "Ödediğin" / "Hedefin" / "En ucuz". */
  name: string;
  /** "28.999 TL". */
  value: string;
}

export interface PriceHistoryTile {
  label: string;
  value: ReactNode;
  /** saving = the low tile (savings-subtle). */
  tone?: "default" | "saving";
}

export interface PriceHistoryProps {
  /** "Fiyat · son 14 gün". */
  title: string;
  /** "2 Kas – bugün"; Product Detail adds the buy-or-wait hint beside it. */
  range: ReactNode;
  /** Cheapest price per day, oldest first; null = no data that day. */
  cheapest: readonly (number | null)[];
  /** Value range and grid from `priceChartModel`; grid labels already formatted ("29.000"). */
  min: number;
  max: number;
  grid: readonly { value: number; label: string }[];
  /** Date labels under the chart (first, middle, "Bugün"). */
  dates: readonly { index: number; label: string }[];
  /** Step changes of the cheapest price: hollow point + price label ("27.899"). */
  steps: readonly { index: number; label: string }[];
  /** Price paid (solid) or target (dotted); null = no reference line. */
  reference: { value: number; kind: "paid" | "target"; end: PriceHistoryEnd } | null;
  /** End label of the cheapest line. */
  cheapestEnd: PriceHistoryEnd;
  /** "Fark 3.002 TL" — shown when the cheapest is below the reference. */
  gap: string | null;
  /** Legend row: reference, cheapest and (with a gap) the filled area. */
  legend: { reference?: string; cheapest: string; gap?: string };
  tiles: readonly PriceHistoryTile[];
  /** Hover/tap read-out ("14 Kasım · 25.997 TL"). */
  readout: (index: number, value: number) => string;
  /** The whole chart in one sentence for assistive technology. */
  label: string;
  /**
   * Product Detail: the day tracking started. Days before it (another user's tracking) are drawn
   * dimmed; a marker with `label` ("1 Kas · Aldın") stands at that day; the gap fill starts there.
   */
  trackingStart?: { index: number; label: string; legend: string } | null;
  className?: string;
}

/** Tile grids: three in Hemen Gözat, four on Product Detail (two per row on phones). */
const TILE_COLUMNS: Record<number, string> = { 3: "grid-cols-3", 4: "grid-cols-2 md:grid-cols-4" };

export function PriceHistory({ title, range, cheapest, min, max, grid, dates, steps, reference, cheapestEnd, gap, legend, tiles, readout, label, trackingStart = null, className }: PriceHistoryProps) {
  const [hover, setHover] = useState<number | null>(null);
  const span = max - min || 1;
  const last = Math.max(1, cheapest.length - 1);
  const x = (index: number) => (index / last) * VIEW;
  const y = (value: number) => PAD + ((max - value) / span) * (VIEW - PAD * 2);

  const known = cheapest.map((value, index) => ({ value, index })).filter((entry): entry is { value: number; index: number } => entry.value !== null);
  const start = trackingStart && trackingStart.index > 0 && trackingStart.index < cheapest.length ? trackingStart.index : 0;
  const points = (entries: readonly { value: number; index: number }[]) => entries.map((entry) => `${x(entry.index).toFixed(1)},${y(entry.value).toFixed(1)}`).join(" ");
  // Before tracking: dimmed; from the start day on: the live line.
  const before = points(known.filter((entry) => entry.index <= start));
  const line = points(known.filter((entry) => entry.index >= start));
  const lastKnown = known.at(-1) ?? null;
  const firstKnown = known.find((entry) => entry.index >= start) ?? null;

  // The gap between the reference and the cheapest line, where the cheapest is lower.
  const fill =
    reference && firstKnown && lastKnown && known.some((entry) => entry.value < reference.value)
      ? [
          `${x(firstKnown.index).toFixed(1)},${y(reference.value).toFixed(1)}`,
          `${x(lastKnown.index).toFixed(1)},${y(reference.value).toFixed(1)}`,
          ...known.filter((entry) => entry.index >= start).reverse().map((entry) => `${x(entry.index).toFixed(1)},${y(Math.min(entry.value, reference.value)).toFixed(1)}`),
        ].join(" ")
      : null;
  const middle = known[Math.floor(known.length / 2)] ?? null;
  const pillTop = reference && middle ? (y(reference.value) + y(Math.min(middle.value, reference.value))) / 2 : null;

  const ends = [
    ...(reference ? [{ key: "reference", top: y(reference.value), end: reference.end, tone: "text-text" }] : []),
    ...(lastKnown ? [{ key: "cheapest", top: y(lastKnown.value), end: cheapestEnd, tone: "text-savings" }] : []),
  ].sort((a, b) => a.top - b.top);
  for (let index = 1; index < ends.length; index += 1) {
    const previous = ends[index - 1];
    const end = ends[index];
    if (previous && end && end.top - previous.top < MIN_LABEL_GAP) end.top = previous.top + MIN_LABEL_GAP;
  }

  const read = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    const index = Math.round(((event.clientX - box.left) / box.width) * last);
    setHover(Math.max(0, Math.min(cheapest.length - 1, index)));
  };
  const hovered = hover === null ? null : (cheapest[hover] ?? null);

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3 rounded-md border border-border p-4", className)}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-body-sm font-semibold text-text">{title}</span>
        <span className="text-caption text-text-muted">{range}</span>
      </figcaption>

      <div className="flex min-w-0 items-stretch gap-2">
        {/* Price grid labels, at their line's height. */}
        <div aria-hidden="true" className="relative h-(--size-chart-summary-height) shrink-0">
          <span className="invisible flex flex-col text-caption">
            {grid.map((entry) => (
              <span key={entry.value}>{entry.label}</span>
            ))}
          </span>
          {grid.map((entry) => (
            <span key={entry.value} style={{ "--y": `${y(entry.value).toFixed(1)}%` } as Vars} className="absolute right-0 top-(--y) -translate-y-1/2 text-caption text-text-muted">
              {entry.label}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            role="img"
            aria-label={label}
            className="relative h-(--size-chart-summary-height) min-w-0 touch-pan-y"
            onPointerMove={read}
            onPointerDown={read}
            onPointerLeave={(event) => event.pointerType === "mouse" && setHover(null)}
          >
            <svg viewBox={`0 0 ${VIEW} ${VIEW}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
              {grid.map((entry) => (
                <line key={entry.value} x1={0} x2={VIEW} y1={y(entry.value)} y2={y(entry.value)} strokeDasharray={GRID_DASH} vectorEffect="non-scaling-stroke" className="stroke-chart-grid stroke-1" />
              ))}
              <line x1={0} x2={VIEW} y1={VIEW - PAD / 2} y2={VIEW - PAD / 2} vectorEffect="non-scaling-stroke" className="stroke-chart-grid stroke-1" />
              {fill && <polygon points={fill} className="fill-savings-subtle" data-testid="price-gap" />}
              {reference && (
                <line
                  x1={0}
                  x2={VIEW}
                  y1={y(reference.value)}
                  y2={y(reference.value)}
                  vectorEffect="non-scaling-stroke"
                  {...(reference.kind === "target" ? { strokeDasharray: DOTTED } : {})}
                  className={cn("stroke-2", reference.kind === "paid" ? "stroke-chart-paid" : "stroke-text")}
                />
              )}
              {start > 0 && (
                <>
                  <polyline points={before} fill="none" strokeDasharray={DASHED} strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-text-muted stroke-2 opacity-(--component-button-disabled-opacity)" data-testid="price-before" />
                  <line x1={x(start)} x2={x(start)} y1={0} y2={VIEW} vectorEffect="non-scaling-stroke" className="stroke-text-muted stroke-1" data-testid="tracking-start" />
                </>
              )}
              {known.filter((entry) => entry.index >= start).length > 1 && <polyline points={line} fill="none" strokeDasharray={DASHED} strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-chart-best stroke-2" />}
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={VIEW} vectorEffect="non-scaling-stroke" className="stroke-chart-grid stroke-1" />}
            </svg>
            {/* Points and labels are HTML so they stay round and readable however the chart stretches. */}
            {steps.map((step) => {
              const value = cheapest[step.index];
              if (value === null || value === undefined || step.index === lastKnown?.index || step.index < start) return null;
              return (
                <span key={step.index}>
                  <Point left={x(step.index)} top={y(value)} className="border-(length:--border-width-strong) border-chart-best bg-surface" testId="step-point" />
                  <span
                    style={{ "--x": `${x(step.index).toFixed(1)}%`, "--y": `${y(value).toFixed(1)}%` } as Vars}
                    className="absolute top-(--y) left-(--x) mt-2 text-caption font-semibold whitespace-nowrap text-savings"
                  >
                    {step.label}
                  </span>
                </span>
              );
            })}
            {lastKnown && <Point left={x(lastKnown.index)} top={y(lastKnown.value)} large className="border-(length:--border-width-strong) border-surface bg-chart-best" />}
            {start > 0 && trackingStart && (
              <span
                style={{ "--x": `${x(start).toFixed(1)}%` } as Vars}
                className="absolute top-0 left-(--x) ml-1 text-caption font-semibold whitespace-nowrap text-text-muted"
              >
                {trackingStart.label}
              </span>
            )}
            {gap && pillTop !== null && (
              <span
                style={{ "--y": `${pillTop.toFixed(1)}%` } as Vars}
                className="absolute top-(--y) left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-savings px-2 text-caption font-bold whitespace-nowrap text-on-primary"
              >
                {gap}
              </span>
            )}
            {hover !== null && hovered !== null && (
              <span
                role="status"
                style={(x(hover) > VIEW / 2 ? { "--x-end": `${(VIEW - x(hover)).toFixed(1)}%` } : { "--x": `${x(hover).toFixed(1)}%` }) as Vars}
                className={cn(
                  "absolute top-0 z-(--z-index-tooltip) rounded-sm bg-text px-2 py-1 text-caption whitespace-nowrap text-text-inverse shadow-md",
                  x(hover) > VIEW / 2 ? "right-(--x-end)" : "left-(--x)",
                )}
              >
                {readout(hover, hovered)}
              </span>
            )}
          </div>
          {/* Date labels: first, middle, "Bugün". */}
          <div aria-hidden="true" className="relative h-(--text-caption--line-height) text-caption text-text-muted">
            {dates.map((date) => (
              <span
                key={date.index}
                style={{ "--x": `${x(date.index).toFixed(1)}%` } as Vars}
                className={cn(
                  "absolute top-0 whitespace-nowrap",
                  date.index === 0 ? "left-0" : date.index === cheapest.length - 1 ? "right-0" : "left-(--x) -translate-x-1/2",
                )}
              >
                {date.label}
              </span>
            ))}
          </div>
        </div>

        {/* Direct end labels: name + value at their line's height. */}
        {ends.length > 0 && (
          <div aria-hidden="true" className="relative h-(--size-chart-summary-height) shrink-0">
            <span className="invisible flex flex-col">
              {ends.map((end) => (
                <EndLabel key={end.key} end={end.end} tone={end.tone} />
              ))}
            </span>
            {ends.map((end) => (
              <span key={end.key} style={{ "--y": `${end.top.toFixed(1)}%` } as Vars} className="absolute inset-x-0 top-(--y) -translate-y-1/2">
                <EndLabel end={end.end} tone={end.tone} />
              </span>
            ))}
          </div>
        )}
      </div>

      <ul aria-hidden="true" className="flex flex-wrap gap-4 text-caption text-text-muted">
        {legend.reference && reference && (
          <li className="inline-flex items-center gap-1">
            <LegendLine kind={reference.kind} />
            {legend.reference}
          </li>
        )}
        <li className="inline-flex items-center gap-1">
          <LegendLine kind="cheapest" />
          {legend.cheapest}
        </li>
        {legend.gap && fill && (
          <li className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-savings-subtle" />
            {legend.gap}
          </li>
        )}
        {start > 0 && trackingStart && (
          <li className="inline-flex items-center gap-1">
            <LegendLine kind="before" />
            {trackingStart.legend}
          </li>
        )}
      </ul>

      {tiles.length > 0 && (
        <dl className={cn("grid gap-2", TILE_COLUMNS[tiles.length] ?? "grid-cols-3")}>
          {tiles.map((tile) => (
            <div key={tile.label} className={cn("flex min-w-0 flex-col rounded-md px-3 py-2", tile.tone === "saving" ? "bg-savings-subtle text-on-primary-subtle" : "bg-surface-alt")}>
              <dt className={cn("text-caption", tile.tone === "saving" ? "text-on-primary-subtle" : "text-text-muted")}>{tile.label}</dt>
              <dd className="text-body-sm font-bold">{tile.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </figure>
  );
}

function EndLabel({ end, tone }: { end: PriceHistoryEnd; tone: string }) {
  return (
    <span className={cn("flex flex-col whitespace-nowrap", tone)}>
      <span className="text-caption">{end.name}</span>
      <span className="text-body-sm font-bold">{end.value}</span>
    </span>
  );
}

function LegendLine({ kind }: { kind: "paid" | "target" | "cheapest" | "before" }) {
  return (
    <svg viewBox="0 0 16 8" preserveAspectRatio="none" aria-hidden="true" className="h-2 w-4 shrink-0">
      <line
        x1={0}
        x2={16}
        y1={4}
        y2={4}
        vectorEffect="non-scaling-stroke"
        {...(kind === "cheapest" || kind === "before" ? { strokeDasharray: DASHED } : kind === "target" ? { strokeDasharray: DOTTED } : {})}
        className={cn(
          "stroke-2",
          kind === "cheapest" ? "stroke-chart-best" : kind === "paid" ? "stroke-chart-paid" : kind === "before" ? "stroke-text-muted opacity-(--component-button-disabled-opacity)" : "stroke-text",
        )}
      />
    </svg>
  );
}

function Point({ left, top, className, large = false, testId }: { left: number; top: number; className: string; large?: boolean; testId?: string }) {
  return (
    <span
      data-testid={testId}
      style={{ "--x": `${left.toFixed(1)}%`, "--y": `${top.toFixed(1)}%` } as Vars}
      className={cn("absolute top-(--y) left-(--x) -translate-x-1/2 -translate-y-1/2 rounded-pill", large ? "size-3" : "size-2", className)}
    />
  );
}
