import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { SignIn } from "../../../../components/auth/sign-in";

// Sign-in and Sign-up — design "8 Giriş" v2.1 (docs/screen_status.md), mock sign-in in Phase 1.
export default async function SignInPage({ params }: PageProps<"/[locale]/giris">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SignIn locale={locale} />;
}
