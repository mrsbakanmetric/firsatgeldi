import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/shell/app-shell";

// Every user screen renders inside AppShell. Until the mock session (plan step 9)
// the viewer is a guest inside the app: normal navigation with "Giriş yap".
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <AppShell locale={locale} viewer={{ kind: "guest" }}>
      {children}
    </AppShell>
  );
}
