// HeroBlock (pagedesign.md §5, product_design_pattern.md §2): the one dark
// `hero-surface` block of a page (Sign-in, Home deal, My Savings). Content is
// free; text on it uses on-hero-surface / on-hero-muted. One per surface.
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface HeroBlockProps {
  /** Accessible name of the region ("FırsatGeldi nedir"). */
  label: string;
  children: ReactNode;
  className?: string;
}

export function HeroBlock({ label, children, className }: HeroBlockProps) {
  return (
    <section aria-label={label} className={cn("flex flex-col gap-6 rounded-xl bg-hero-surface p-6 text-on-hero-surface md:p-8", className)}>
      {children}
    </section>
  );
}
