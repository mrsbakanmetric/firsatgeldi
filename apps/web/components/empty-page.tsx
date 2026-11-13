// A main-navigation route rendered as the shell with an empty template (plan
// step 8). Each screen replaces its empty page in its own step (10 onwards),
// built only from its approved design.
import { createTranslator, isLocale, type TranslationKey } from "@firsatgeldi/i18n";
import { PageTemplate, type PageTemplateKind } from "@firsatgeldi/ui";
import { notFound } from "next/navigation";

export async function EmptyPage({ params, kind, titleKey }: { params: Promise<{ locale: string }>; kind: PageTemplateKind; titleKey: TranslationKey }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslator(locale);
  return (
    <PageTemplate kind={kind} title={t(titleKey)}>
      {null}
    </PageTemplate>
  );
}
