import { EmptyPage } from "../../../../components/empty-page";

// Profilim (Discover and Profile) — empty list template until its screen step (docs/implementation_plan.md).
export default function ProfilePage({ params }: PageProps<"/[locale]/profil">) {
  return <EmptyPage params={params} kind="list" titleKey="pages.profile" />;
}
