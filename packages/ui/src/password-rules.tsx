// PasswordRules (pagedesign.md §5 [DECIDED 2026-11-18], product_design_pattern.md §5.36):
// the live checklist under a new-password field — a check in `savings` when met, a muted
// dot when not; text + icon, never colour alone. Announced politely as it changes.
import { Check, Dot } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface PasswordRule {
  readonly id: string;
  readonly text: string;
  readonly met: boolean;
}

export interface PasswordRulesProps {
  /** Accessible name of the list ("Şifre kuralları"). */
  label: string;
  rules: readonly PasswordRule[];
  /** Read with each rule for assistive technology ("tamam" / "eksik"). */
  metLabel: string;
  unmetLabel: string;
  className?: string;
}

export function PasswordRules({ label, rules, metLabel, unmetLabel, className }: PasswordRulesProps) {
  return (
    <ul aria-label={label} aria-live="polite" className={cn("flex flex-wrap gap-x-4 gap-y-1", className)}>
      {rules.map((rule) => (
        <li key={rule.id} className={cn("flex items-center gap-1 text-caption font-semibold", rule.met ? "text-savings" : "text-text-muted")}>
          <Icon icon={rule.met ? Check : Dot} size="sm" />
          <span>{rule.text}</span>
          <span className="sr-only">{rule.met ? metLabel : unmetLabel}</span>
        </li>
      ))}
    </ul>
  );
}
