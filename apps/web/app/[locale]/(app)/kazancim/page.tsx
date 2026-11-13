import { EmptyPage } from "../../../../components/empty-page";

// My Savings — empty summary template until its screen step (docs/implementation_plan.md).
export default function SavingsPage({ params }: PageProps<"/[locale]/kazancim">) {
  return <EmptyPage params={params} kind="summary" titleKey="pages.savings" />;
}
