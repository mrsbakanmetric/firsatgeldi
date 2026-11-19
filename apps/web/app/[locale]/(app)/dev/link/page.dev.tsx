// Development-only link reading test: /tr/dev/link, /en/dev/link (data test, plan step 23).
// The ".dev.tsx" extension is a page extension only in development (next.config.ts), so this
// route does not exist in a production build. Inside AppShell like every user screen.
import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { LinkReader } from "../../../../../components/dev/link-reader";

export default async function LinkReaderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LinkReader locale={locale} />;
}
