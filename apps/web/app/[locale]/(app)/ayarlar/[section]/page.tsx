import { createTranslator, isLocale } from "@firsatgeldi/i18n";
import { PageTemplate } from "@firsatgeldi/ui";
import { notFound } from "next/navigation";
import { DEFAULT_SETTINGS_SECTION } from "../../../../../lib/shell/navigation";

// Section names are added with the Settings and Account screen (architecture.md §21.1).
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ section: DEFAULT_SETTINGS_SECTION }];
}

// Settings and Account — empty settings template until its screen step (docs/implementation_plan.md).
export default async function SettingsPage({ params }: PageProps<"/[locale]/ayarlar/[section]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslator(locale);
  return (
    <PageTemplate kind="settings" title={t("pages.settings")}>
      {null}
    </PageTemplate>
  );
}
