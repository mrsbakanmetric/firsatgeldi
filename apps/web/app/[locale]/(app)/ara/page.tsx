import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { SearchAndAdd } from "../../../../components/search-add/search-and-add";

// Search and Add — design "1 Ara ve Ekle" v1 (docs/screen_status.md), on the mock API in Phase 1.
export default async function SearchPage({ params }: PageProps<"/[locale]/ara">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SearchAndAdd locale={locale} />;
}
