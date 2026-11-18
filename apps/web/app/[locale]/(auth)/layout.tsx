import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { AuthShell } from "../../../components/shell/auth-shell";

// Sign-in, sign-up, new password and e-mail verification render inside AuthShell
// (pagedesign.md §2.2): logo + language switch, no main navigation.
export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AuthShell locale={locale}>{children}</AuthShell>;
}
