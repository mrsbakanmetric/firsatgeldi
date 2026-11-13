import { EmptyPage } from "../../../../components/empty-page";

// Packages and Premium — empty summary template until its screen step (docs/implementation_plan.md).
export default function PlanPage({ params }: PageProps<"/[locale]/paketim">) {
  return <EmptyPage params={params} kind="summary" titleKey="pages.plan" />;
}
