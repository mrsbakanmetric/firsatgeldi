import { EmptyPage } from "../../../../components/empty-page";

// Search and Add — empty flow template until its screen step (docs/implementation_plan.md).
export default function SearchPage({ params }: PageProps<"/[locale]/ara">) {
  return <EmptyPage params={params} kind="flow" titleKey="pages.search" />;
}
