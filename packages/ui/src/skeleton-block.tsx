// SkeletonBlock (product_design_pattern.md §5.23): placeholder in the shape
// and size of the content it replaces, filled with surface-alt, existing radii.
// Static (no shimmer): no looping motion in the app (§9).
import { cn } from "./cn";

export type SkeletonShape = "line" | "title" | "thumb" | "pill" | "card";
export type SkeletonWidth = "full" | "3/4" | "2/3" | "1/2" | "1/3" | "1/4";

const SHAPE_CLASSES: Record<SkeletonShape, string> = {
  line: "h-3 rounded-sm",
  title: "h-4 rounded-sm",
  thumb: "size-(--size-thumb-sm) shrink-0 rounded-sm",
  pill: "h-3 rounded-pill",
  card: "h-(--size-thumb-md) rounded-lg",
};

const WIDTH_CLASSES: Record<SkeletonWidth, string> = {
  full: "w-full",
  "3/4": "w-3/4",
  "2/3": "w-2/3",
  "1/2": "w-1/2",
  "1/3": "w-1/3",
  "1/4": "w-1/4",
};

export interface SkeletonBlockProps {
  shape?: SkeletonShape;
  width?: SkeletonWidth;
  className?: string;
}

export function SkeletonBlock({ shape = "line", width = "full", className }: SkeletonBlockProps) {
  return <span aria-hidden="true" className={cn("block bg-surface-alt", SHAPE_CLASSES[shape], shape !== "thumb" && WIDTH_CLASSES[width], className)} />;
}

/** A list-row placeholder (thumbnail + three lines), as drawn in the loading state. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex gap-3 rounded-lg border border-border bg-surface p-3", className)}>
      <SkeletonBlock shape="thumb" />
      <span className="flex flex-1 flex-col gap-2">
        <SkeletonBlock shape="pill" width="1/3" />
        <SkeletonBlock shape="title" width="3/4" />
        <SkeletonBlock width="1/2" />
      </span>
    </span>
  );
}
