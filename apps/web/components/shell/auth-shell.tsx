"use client";

// AuthShell (pagedesign.md §2.2): sign-in, sign-up, password reset, e-mail
// verification. Header with logo + language switch only; minimal footer.
import type { Locale } from "@firsatgeldi/i18n";
import type { ReactNode } from "react";
import { LanguageSwitch, Logo, SiteFooter, SkipLink, useTranslator } from "./parts";

export function AuthShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = useTranslator(locale);
  return (
    <div className="flex min-h-dvh flex-col bg-background text-text">
      <SkipLink t={t} />
      <header className="sticky top-0 z-(--z-index-sticky) h-(--size-header-height) shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex h-full max-w-(--size-content-max-width) items-center justify-between gap-4 px-4 md:px-6">
          <Logo locale={locale} t={t} />
          <LanguageSwitch locale={locale} t={t} />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter locale={locale} t={t} variant="auth" />
    </div>
  );
}
