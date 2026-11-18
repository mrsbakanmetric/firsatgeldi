import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { NewPasswordPage } from "../../../../components/auth/link-pages";

// New password from the reset e-mail link — design "8 Giriş" v2.1, board Links.
export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/sifre-sifirla">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <NewPasswordPage locale={locale} />;
}
