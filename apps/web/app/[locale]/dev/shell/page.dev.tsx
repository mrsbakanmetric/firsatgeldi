// Development-only shell preview [DECIDED 2026-11-14]: /tr/dev/shell, /en/dev/shell.
// The ".dev.tsx" extension is a page extension only in development
// (next.config.ts), so this route does not exist in a production build.
import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { ShellPreview } from "../../../../components/dev/shell-preview";

export default async function ShellPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ShellPreview locale={locale} />;
}
