import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { VerifyEmailPage } from "../../../../components/auth/link-pages";

// E-mail verification link — design "8 Giriş" v2.1, board Links.
export default async function VerifyPage({ params }: PageProps<"/[locale]/dogrula">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <VerifyEmailPage locale={locale} />;
}
