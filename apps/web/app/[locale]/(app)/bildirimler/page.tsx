import { EmptyPage } from "../../../../components/empty-page";

// Notifications — empty list template until its screen step (docs/implementation_plan.md).
export default function NotificationsPage({ params }: PageProps<"/[locale]/bildirimler">) {
  return <EmptyPage params={params} kind="list" titleKey="pages.notifications" />;
}
