import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/shell/app-shell";

// Every user screen renders inside AppShell. The viewer stays a guest until the
// shell reads the session (useSession, GET /me) with the first screen step.
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <AppShell locale={locale} viewer={{ kind: "guest" }}>
      {children}
    </AppShell>
  );
}
