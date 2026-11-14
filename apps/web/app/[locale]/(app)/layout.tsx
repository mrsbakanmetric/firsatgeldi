import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { SessionAppShell } from "../../../components/shell/session-app-shell";

// Every user screen renders inside AppShell, bound to the session (GET /me).
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SessionAppShell locale={locale}>{children}</SessionAppShell>;
}
