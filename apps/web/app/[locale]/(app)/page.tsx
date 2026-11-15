import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { Home } from "../../../components/home/home";

// Home — design "3 Ana Sayfa" v2 (docs/screen_status.md), on the mock API in Phase 1.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Home locale={locale} />;
}
