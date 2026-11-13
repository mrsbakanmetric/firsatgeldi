import { EmptyPage } from "../../../../components/empty-page";

// Discover — empty list template until its screen step (docs/implementation_plan.md).
export default function DiscoverPage({ params }: PageProps<"/[locale]/kesfet">) {
  return <EmptyPage params={params} kind="list" titleKey="pages.discover" />;
}
