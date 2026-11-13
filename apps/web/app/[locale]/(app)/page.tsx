import { EmptyPage } from "../../../components/empty-page";

// Home — empty summary template until its screen step (docs/implementation_plan.md).
export default function HomePage({ params }: PageProps<"/[locale]">) {
  return <EmptyPage params={params} kind="summary" titleKey="pages.home" />;
}
