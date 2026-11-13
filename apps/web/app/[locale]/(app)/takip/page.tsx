import { EmptyPage } from "../../../../components/empty-page";

// Tracked Items — empty list template until its screen step (docs/implementation_plan.md).
export default function TrackingPage({ params }: PageProps<"/[locale]/takip">) {
  return <EmptyPage params={params} kind="list" titleKey="pages.tracking" />;
}
