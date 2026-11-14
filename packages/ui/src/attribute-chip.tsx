"use client";

// AttributeChip (product_design_pattern.md §5.27): "Renk Siyah" opens the
// allowed values of the category template under it, plus "type it if not
// listed"; the current value carries a check. A changed chip keeps an
// emphasised border. Match-critical attributes warn that the mark is cleared.
import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "./button";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";
import { TextField } from "./text-field";

export interface AttributeChipTexts {
  /** Heading of the value list ("Bu modelde bulunan renkler"); defaults to the label. */
  listHeading?: string;
  /** Field label "Listede yoksa yaz". */
  typeLabel: string;
  /** Submit of the typed value ("Uygula"). */
  applyLabel: string;
  closeLabel: string;
  /** Source note ("Seçenekler kategori şablonundan gelir."). */
  sourceNote: string;
  /** Warning for match-critical attributes. */
  warning?: string;
}

export interface AttributeChipProps {
  label: string;
  value: string;
  options: readonly string[];
  onPick: (value: string) => void;
  /** Emphasised border while the value differs from what we understood. */
  changed?: boolean;
  texts: AttributeChipTexts;
}

export function AttributeChip({ label, value, options, onPick, changed = false, texts }: AttributeChipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const emphasised = open || changed;

  const pick = (next: string) => {
    setOpen(false);
    setTyped("");
    if (next !== value) onPick(next);
  };
  const submitTyped = (event: FormEvent) => {
    event.preventDefault();
    const next = typed.trim();
    if (next) pick(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex min-h-(--size-touch-target-min) items-center gap-1 self-start rounded-pill px-3 text-body-sm text-text",
          emphasised ? "border-(length:--border-width-strong) border-primary bg-primary-subtle" : "border border-border bg-surface",
          focusRing,
        )}
      >
        <span className="text-text-muted">{label}</span>
        <strong className="font-semibold">{value}</strong>
        <Icon icon={ChevronDown} size="sm" />
      </button>
      {open && (
        <div id={`${id}-list`} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-md">
          <p id={`${id}-heading`} className="text-caption text-text-muted">
            {texts.listHeading ?? label}
          </p>
          <div role="listbox" aria-labelledby={`${id}-heading`} className="flex flex-wrap gap-2">
            {options.map((option) => {
              const selected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(option)}
                  className={cn(
                    "inline-flex min-h-(--size-touch-target-min) items-center gap-1 rounded-md px-3 text-body-sm",
                    selected ? "border-(length:--border-width-strong) border-primary font-semibold text-text" : "border border-border text-text",
                    focusRing,
                  )}
                >
                  {selected && <Icon icon={Check} size="sm" className="text-primary" />}
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {texts.warning && (
            <p className="flex items-start gap-1 text-caption text-on-warning-subtle">
              <Icon icon={TriangleAlert} size="sm" />
              <span>{texts.warning}</span>
            </p>
          )}
          <form onSubmit={submitTyped} className="flex items-end gap-2">
            <TextField label={texts.typeLabel} value={typed} onChange={(event) => setTyped(event.target.value)} className="flex-1" />
            <Button type="submit" variant="secondary" disabled={!typed.trim()}>
              {texts.applyLabel}
            </Button>
          </form>
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption text-text-muted">{texts.sourceNote}</p>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {texts.closeLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
