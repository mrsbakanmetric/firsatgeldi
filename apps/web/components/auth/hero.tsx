// Sign-in hero (design "8 Giriş" v2.1, left column): what FırsatGeldi does, an example
// "Fırsat geldi" notification and three steps. The page's h1. On phones it comes after
// the form (design v2.1 phone rule). Coral once per surface: the hero has no deal action,
// so its flag is the coral element (product_design_pattern.md §5.8).
import type { Translator } from "@firsatgeldi/i18n";
import { Flag, HeroBlock, ProductImage } from "@firsatgeldi/ui";
import { Camera, Zap } from "lucide-react";

export function AuthHero({ t }: { t: Translator }) {
  const steps = [t("auth.hero.step1"), t("auth.hero.step2"), t("auth.hero.step3")];
  return (
    <HeroBlock label={t("auth.hero.label")} className="flex-1 justify-center">
      <h1 className="text-display text-on-hero-surface">{t("auth.hero.title")}</h1>
      <p className="text-body text-on-hero-muted">{t("auth.hero.text")}</p>
      <div className="flex items-center gap-4 rounded-lg bg-surface p-4 text-text">
        <ProductImage src={null} alt={t("auth.hero.exampleImage")} size="md" fallbackIcon={Camera} />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Flag tone="deal" icon={Zap}>
            {t("auth.hero.exampleFlag")}
          </Flag>
          <span className="text-body-sm font-semibold text-text">{t("auth.hero.exampleText")}</span>
          <span className="text-caption text-text-muted">{t("auth.hero.exampleMeta")}</span>
        </div>
      </div>
      <ol aria-label={t("auth.hero.stepsLabel")} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="flex flex-row items-center gap-2 text-body-sm font-semibold text-on-hero-surface md:flex-col md:items-start">
            <span aria-hidden="true" className="flex size-(--size-step-indicator-dot) shrink-0 items-center justify-center rounded-pill bg-hero-savings text-caption font-bold text-hero-surface">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </HeroBlock>
  );
}
