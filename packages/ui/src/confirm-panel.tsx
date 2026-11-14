// ConfirmPanel (product_design_pattern.md §5.1; pagedesign.md §8.2): the
// "Emin ol, sonra onayla" area for the marked product — everything we assumed,
// editable, then the confirming actions. This is the frame; the fields come
// from the screen (Search and Add, Add product dialog, Want to Buy "Aldım").
// On phones the same content sits in a Sheet, so the frame has no own border there.
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface ConfirmPanelProps {
  /** "Emin ol, sonra onayla"; omitted inside a Sheet (the sheet shows it). */
  title?: string;
  /** "Varsaydıklarımızı kontrol et; dokunup değiştirebilirsin." */
  intro?: string;
  /** The marked product (image, name, variant, "Değiştir"). */
  product?: ReactNode;
  /** Field sections. */
  children: ReactNode;
  /** Confirming actions and their note. */
  footer?: ReactNode;
  framed?: boolean;
  className?: string;
}

export function ConfirmPanel({ title, intro, product, children, footer, framed = true, className }: ConfirmPanelProps) {
  return (
    <div className={cn("flex flex-col gap-5", framed && "rounded-lg border border-border bg-surface p-4 shadow-sm", className)}>
      {(title || intro) && (
        <div className="flex flex-col gap-1">
          {title && <h2 className="text-h3 text-text">{title}</h2>}
          {intro && <p className="text-body-sm text-text-muted">{intro}</p>}
        </div>
      )}
      {product}
      {children}
      {footer && <div className="flex flex-col gap-3">{footer}</div>}
    </div>
  );
}

/** One titled group of fields ("ALDIĞIN İLAN", "SATIN ALMA", "İADE SÜRESİ"). */
export function ConfirmSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("flex flex-col gap-3 border-t border-divider pt-4", className)}>
      <h3 className="text-caption text-text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}
