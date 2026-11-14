// PriceSparkline (pagedesign.md §5; product_design_pattern.md §5.6, compact
// version): 14 days in a small chart — the price you paid (solid, ink, with the
// hollow "Aldın" point), the cheapest price (dashed, emerald), the target
// (dotted, text colour). Styles differ by line pattern as well as colour; the
// row writes the values and one conclusion sentence next to it.
import { cn } from "./cn";

/** Drawing space of the SVG (not screen pixels); the chart stretches to its slot. */
const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 40;
const PAD = 4;
/** Line patterns (in drawing units): dashed = cheapest, dotted = target. */
const DASHED = "6 4";
const DOTTED = "1.5 3";
const POINT_RADIUS = 2.5;

export interface PriceSparklineProps {
  /** Cheapest price per day, oldest first; null = no data that day (not drawn). */
  cheapest: readonly (number | null)[];
  /** Price paid (bought mode). */
  paid?: number | null;
  /** Index of the purchase day in `cheapest` (hollow point), when inside the period. */
  paidIndex?: number | null;
  /** Target price (want mode). */
  target?: number | null;
  /** Values in words for assistive technology ("Ödediğin 28.999 TL, en ucuz 25.997 TL"). */
  label: string;
  className?: string;
}

export function PriceSparkline({ cheapest, paid = null, paidIndex = null, target = null, label, className }: PriceSparklineProps) {
  const values = [...cheapest.filter((value): value is number => value !== null), ...(paid === null ? [] : [paid]), ...(target === null ? [] : [target])];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const steps = Math.max(1, cheapest.length - 1);
  const x = (index: number) => (index / steps) * VIEW_WIDTH;
  const y = (value: number) => PAD + ((high - value) / span) * (VIEW_HEIGHT - PAD * 2);
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

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" className={cn("h-10 w-full overflow-visible", className)}>
      {target !== null && (
        <line x1={0} x2={VIEW_WIDTH} y1={y(target)} y2={y(target)} strokeDasharray={DOTTED} vectorEffect="non-scaling-stroke" className="stroke-text stroke-2" />
      )}
      {paid !== null && (
        <line x1={x(paidIndex ?? 0)} x2={VIEW_WIDTH} y1={y(paid)} y2={y(paid)} vectorEffect="non-scaling-stroke" className="stroke-chart-paid stroke-2" />
      )}
      {segments.map((points) =>
        points.includes(" ") ? (
          <polyline key={points} points={points} fill="none" strokeDasharray={DASHED} vectorEffect="non-scaling-stroke" className="stroke-chart-best stroke-2" />
        ) : (
          <circle key={points} cx={points.split(",")[0]} cy={points.split(",")[1]} r={POINT_RADIUS} className="fill-chart-best" />
        ),
      )}
      {paid !== null && paidIndex !== null && (
        <circle cx={x(paidIndex)} cy={y(paid)} r={POINT_RADIUS} vectorEffect="non-scaling-stroke" className="fill-surface stroke-chart-paid stroke-2" />
      )}
    </svg>
  );
}
