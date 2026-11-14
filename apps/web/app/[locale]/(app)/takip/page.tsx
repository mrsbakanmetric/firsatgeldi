import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { TrackedItems } from "../../../../components/tracked-items/tracked-items";

// Tracked Items — design "4 Takip Ettiklerim" v2 (docs/screen_status.md), on the mock API in Phase 1.
export default async function TrackingPage({ params }: PageProps<"/[locale]/takip">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TrackedItems locale={locale} />;
}
