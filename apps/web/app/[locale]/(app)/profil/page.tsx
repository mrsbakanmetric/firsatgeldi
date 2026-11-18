import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { MyProfile } from "../../../../components/profile/my-profile";

// Profilim — design "13 Keşfet ve Profil" v2.1 Me (docs/screen_status.md), on the mock API in Phase 1.
export default async function ProfilePage({ params }: PageProps<"/[locale]/profil">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <MyProfile locale={locale} />;
}
