import { createTranslator, isLocale, LOCALES } from "@firsatgeldi/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { themeInitScript } from "../../lib/theme/theme-dom";
import "../globals.css";

// Only the supported languages exist; any other first segment is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: createTranslator(locale)("meta.title") };
}

// suppressHydrationWarning: the inline theme script may set data-theme on <html> before React hydrates.
export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background font-base text-body text-text antialiased">{children}</body>
    </html>
  );
}
