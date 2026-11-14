// MoneyDisplay (product_design_pattern.md §5.9): the amount is formatted in the
// user's language by the caller (core formatMoney). The user's own price is
// ink, the cheapest price is emerald, a saving is emerald with a down arrow.
import { ArrowDown } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

export type MoneyTone = "own" | "cheapest" | "saving";
export type MoneySize = "body" | "price" | "price-lg";

const TONE_CLASSES: Record<MoneyTone, string> = {
  own: "text-text",
  cheapest: "text-savings",
  saving: "text-savings",
};

const SIZE_CLASSES: Record<MoneySize, string> = {
  body: "text-body font-semibold",
  price: "text-price",
  "price-lg": "text-price-lg",
};

export interface MoneyDisplayProps {
  /** Already formatted ("25.997 TL"). */
  value: string;
  tone?: MoneyTone;
  size?: MoneySize;
  /** Words after a saving ("kazanç"); the arrow is decorative. */
  suffix?: string;
  className?: string;
}

export function MoneyDisplay({ value, tone = "own", size = "price", suffix, className }: MoneyDisplayProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", TONE_CLASSES[tone], SIZE_CLASSES[size], className)}>
      {tone === "saving" && <Icon icon={ArrowDown} size="sm" />}
      <span>{value}</span>
      {suffix && <span className="text-body-sm font-medium">{suffix}</span>}
    </span>
  );
}
