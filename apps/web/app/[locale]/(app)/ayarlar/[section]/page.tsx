import { isLocale, LOCALES } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { Settings } from "../../../../../components/settings/settings";
import { sectionBySlug, SETTINGS_SECTIONS } from "../../../../../lib/settings/sections";

// Section names in each language (`/tr/ayarlar/profil`, `/en/settings/profile`); any other is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SETTINGS_SECTIONS.map((section) => ({ locale, section: section.slug[locale] })));
}

// Settings and Account — design "9 Ayarlar" v2.1 (docs/screen_status.md), on the mock API in Phase 1.
export default async function SettingsPage({ params }: PageProps<"/[locale]/ayarlar/[section]">) {
  const { locale, section } = await params;
  if (!isLocale(locale)) notFound();
  const id = sectionBySlug(locale, section);
  if (!id) notFound();
  return <Settings locale={locale} section={id} />;
}
