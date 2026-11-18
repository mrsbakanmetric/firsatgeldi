import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { NotificationsPage } from "../../../../components/notifications/notifications-page";

// Notifications — design "5 Bildirimler" v2.1 (docs/screen_status.md), on the mock API in Phase 1.
export default async function NotificationsRoute({ params }: PageProps<"/[locale]/bildirimler">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <NotificationsPage locale={locale} />;
}
