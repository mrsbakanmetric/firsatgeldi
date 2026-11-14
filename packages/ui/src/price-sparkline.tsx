"use client";

// PriceSparkline (pagedesign.md §5; product_design_pattern.md §5.6, compact version;
// Tracked Items design v3): 14 days in a small chart with numbers — the cheapest price
// (dashed, emerald) with its lowest point marked and min/max as small labels; the
// price you paid (solid, ink) ending in a small profile icon with "Sen 28.999 TL";
// the target (dotted). Line ends carry short labels ("En ucuz", "Hedef"). Hover or
// tap shows the day and the price. Styles differ by line pattern as well as colour.
import { UserRound } from "lucide-react";
import { type CSSProperties, type PointerEvent, useState } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

/** Drawing space of the SVG (not screen pixels); the chart stretches to its slot. */
const VIEW = 100;
const PAD = 12;
/** Line patterns (in drawing units): dashed = cheapest, dotted = target. */
const DASHED = "6 4";
const DOTTED = "1.5 3";
/** End labels closer than this (share of the height) are moved apart so they never overlap. */
const MIN_LABEL_GAP = 22;

export interface PriceSparklineLabels {
  /** "En düşük 25.997 TL" / "En yüksek 29.499 TL". */
  min: string;
  max: string;
  /** End of the cheapest line ("En ucuz"). */
  cheapest: string;
  /** End of the paid line ("Sen 28.999 TL"). */
  paid?: string;
  /** End of the target line ("Hedef 7.500 TL"). */
  target?: string;
}

export interface PriceSparklineProps {
  /** Cheapest price per day, oldest first; null = no data that day (not drawn). */
  cheapest: readonly (number | null)[];
  /** Hover/tap read-out for a day: its index in `cheapest` and its value ("14 Kasım · 25.997 TL"). */
  readout: (index: number, value: number) => string;
  paid?: number | null;
  target?: number | null;
  labels: PriceSparklineLabels;
  /** Values in words for assistive technology. */
  label: string;
  className?: string;
}

type Vars = CSSProperties & Record<`--${string}`, string>;

export function PriceSparkline({ cheapest, readout, paid = null, target = null, labels, label, className }: PriceSparklineProps) {
  const [hover, setHover] = useState<number | null>(null);
  const known = cheapest.filter((value): value is number => value !== null);
  const values = [...known, ...(paid === null ? [] : [paid]), ...(target === null ? [] : [target])];
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const span = high - low || 1;
  const steps = Math.max(1, cheapest.length - 1);
  const x = (index: number) => (index / steps) * VIEW;
  const y = (value: number) => PAD + ((high - value) / span) * (VIEW - PAD * 2);

  // Gaps (no data) split the cheapest line into segments.
  const segments: string[] = [];
  let current: string[] = [];
  cheapest.forEach((value, index) => {
    if (value === null) {
      if (current.length) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${x(index).toFixed(1)},${y(value).toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(" "));

  const minValue = known.length ? Math.min(...known) : null;
  const maxValue = known.length ? Math.max(...known) : null;
  const minIndex = minValue === null ? -1 : cheapest.lastIndexOf(minValue);
  const maxIndex = maxValue === null ? -1 : cheapest.indexOf(maxValue);
  const last = [...cheapest].reverse().find((value): value is number => value !== null) ?? null;

  // End labels on the right, in value order, never overlapping.
  const ends = [
    ...(paid !== null && labels.paid ? [{ key: "paid", top: y(paid), text: labels.paid, paid: true }] : []),
    ...(last !== null ? [{ key: "cheapest", top: y(last), text: labels.cheapest, paid: false }] : []),
    ...(target !== null && labels.target ? [{ key: "target", top: y(target), text: labels.target, paid: false }] : []),
  ].sort((a, b) => a.top - b.top);
  for (let index = 1; index < ends.length; index += 1) {
    const previous = ends[index - 1];
    const end = ends[index];
    if (previous && end && end.top - previous.top < MIN_LABEL_GAP) end.top = previous.top + MIN_LABEL_GAP;
  }

  const read = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    const index = Math.round(((event.clientX - box.left) / box.width) * steps);
    setHover(Math.max(0, Math.min(cheapest.length - 1, index)));
  };
  const hovered = hover === null ? null : cheapest[hover];

  return (
    <div className={cn("flex min-w-0 items-stretch gap-2", className)}>
      <div
        role="img"
        aria-label={label}
        className="relative h-16 min-w-0 flex-1 touch-pan-y"
        onPointerMove={read}
        onPointerDown={read}
        onPointerLeave={(event) => event.pointerType === "mouse" && setHover(null)}
      >
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          {target !== null && <line x1={0} x2={VIEW} y1={y(target)} y2={y(target)} strokeDasharray={DOTTED} vectorEffect="non-scaling-stroke" className="stroke-text stroke-2" />}
          {paid !== null && <line x1={0} x2={VIEW} y1={y(paid)} y2={y(paid)} vectorEffect="non-scaling-stroke" className="stroke-chart-paid stroke-2" />}
          {segments.map((points) =>
            points.includes(" ") ? (
              <polyline key={points} points={points} fill="none" strokeDasharray={DASHED} vectorEffect="non-scaling-stroke" className="stroke-chart-best stroke-2" />
            ) : null,
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={VIEW} vectorEffect="non-scaling-stroke" className="stroke-chart-grid stroke-1" />}
        </svg>
        {/* Points are HTML so they stay round however the chart stretches. */}
        {segments
          .filter((points) => !points.includes(" "))
          .map((points) => {
            const [px = "0", py = "0"] = points.split(",");
            return <Dot key={points} left={px} top={py} className="bg-chart-best" />;
          })}
        {minIndex >= 0 && minValue !== null && (
          <>
            <Dot left={x(minIndex).toFixed(1)} top={y(minValue).toFixed(1)} className="border-(length:--border-width-strong) border-chart-best bg-surface" testId="lowest-point" />
            <span
              style={{ "--x": `${x(minIndex).toFixed(1)}%` } as Vars}
              className={cn("absolute bottom-0 translate-y-full text-caption whitespace-nowrap text-text-muted", x(minIndex) > VIEW / 2 ? "right-0" : "left-(--x)")}
            >
              {labels.min}
            </span>
          </>
        )}
        {maxIndex >= 0 && maxValue !== null && maxValue !== minValue && (
          <span
            style={{ "--x": `${x(maxIndex).toFixed(1)}%` } as Vars}
            className={cn("absolute top-0 -translate-y-full text-caption whitespace-nowrap text-text-muted", x(maxIndex) > VIEW / 2 ? "right-0" : "left-(--x)")}
          >
            {labels.max}
          </span>
        )}
        {hover !== null && hovered !== null && hovered !== undefined && (
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
      {ends.length > 0 && (
        <div aria-hidden="true" className="relative h-16 shrink-0">
          {/* Invisible copies give the column its width; the visible labels sit at their line's height. */}
          <span className="invisible flex flex-col">
            {ends.map((end) => (
              <EndLabel key={end.key} text={end.text} paid={end.paid} />
            ))}
          </span>
          {ends.map((end) => (
            <span key={end.key} style={{ "--y": `${end.top.toFixed(1)}%` } as Vars} className="absolute inset-x-0 top-(--y) -translate-y-1/2">
              <EndLabel text={end.text} paid={end.paid} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EndLabel({ text, paid }: { text: string; paid: boolean }) {
  return (
    <span className={cn("flex items-center gap-1 text-caption whitespace-nowrap", paid ? "font-semibold text-text" : "text-text-muted")}>
      {paid && (
        <span className="flex size-(--size-icon-sm) items-center justify-center rounded-pill bg-surface-alt">
          <Icon icon={UserRound} size="sm" />
        </span>
      )}
      {text}
    </span>
  );
}

function Dot({ left, top, className, testId }: { left: string; top: string; className: string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      style={{ "--x": `${left}%`, "--y": `${top}%` } as Vars}
      className={cn("absolute top-(--y) left-(--x) size-2 -translate-x-1/2 -translate-y-1/2 rounded-pill", className)}
    />
  );
}
