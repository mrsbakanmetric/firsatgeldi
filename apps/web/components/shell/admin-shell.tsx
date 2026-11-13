"use client";

// AdminShell (pagedesign.md §2.3, product_design_pattern.md §5.21): header on
// hero-surface with logo + "Yönetim" badge, the admin menu, "Kullanıcı
// görünümüne geç", bell (neutral counter) and avatar; same content width,
// templates and components as the user app; footer line about the Audit Log.
// The second-row sub-navigation is [RECOMMENDED 2026-11-13] and waits for the
// Application Manager review: not built here.
import type { Locale } from "@firsatgeldi/i18n";
import { cn, focusRing, Icon, Menu } from "@firsatgeldi/ui";
import { ArrowLeftRight, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ADMIN_NAV, hrefFor } from "../../lib/shell/navigation";
import { BellButton, Logo, ProfileMenu, SkipLink, useTranslator } from "./parts";

export type AdminSectionId = (typeof ADMIN_NAV)[number]["id"];

export interface AdminShellProps {
  locale: Locale;
  /** The admin section the page belongs to. */
  section: AdminSectionId;
  initials: string;
  unreadCount: number;
  bellPanel?: ReactNode;
  onSignOut?: () => void;
  children: ReactNode;
}

export function AdminShell({ locale, section, initials, unreadCount, bellPanel, onSignOut, children }: AdminShellProps) {
  const t = useTranslator(locale);
  const sections = ADMIN_NAV.map((entry) => ({ ...entry, href: hrefFor(entry.route, locale), label: t(entry.label), current: entry.id === section }));

  return (
    <div className="flex min-h-dvh flex-col bg-background text-text">
      <SkipLink t={t} />
      <header className="sticky top-0 z-(--z-index-sticky) h-(--size-header-height) shrink-0 bg-hero-surface text-on-hero-surface">
        <div className="mx-auto flex h-full max-w-(--size-content-max-width) items-center gap-2 px-4 md:gap-6 md:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <Logo locale={locale} t={t} onHero />
            <span className="rounded-pill bg-hero-savings px-2 py-1 text-caption font-semibold text-hero-surface">{t("shell.admin.badge")}</span>
          </div>

          <nav aria-label={t("shell.admin.nav")} className="hidden h-full min-w-0 items-stretch gap-1 overflow-x-auto md:flex">
            {sections.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                aria-current={entry.current ? "page" : undefined}
                className={cn(
                  "flex min-h-(--size-touch-target-min) shrink-0 items-center border-y-(length:--border-width-strong) border-transparent px-3 text-body-sm whitespace-nowrap",
                  entry.current ? "border-b-hero-savings font-semibold text-on-hero-surface" : "font-medium text-on-hero-muted hover:text-on-hero-surface",
                  focusRing,
                )}
              >
                {entry.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          <Link
            href={hrefFor("/", locale)}
            className={cn("hidden min-h-(--size-touch-target-min) shrink-0 items-center gap-2 rounded-md px-3 text-body-sm font-semibold text-on-hero-surface hover:bg-hero-line md:flex", focusRing)}
          >
            <Icon icon={ArrowLeftRight} />
            <span>{t("shell.admin.userView")}</span>
          </Link>

          <div className="md:hidden">
            <Menu
              label={t("shell.admin.nav")}
              items={[
                ...sections.map((entry) => ({ id: entry.id, label: entry.label, href: entry.href, current: entry.current })),
                { id: "user-view", label: t("shell.admin.userView"), icon: ArrowLeftRight, href: hrefFor("/", locale) },
              ]}
              trigger={
                <button
                  type="button"
                  aria-label={t("shell.admin.nav")}
                  className={cn("flex size-(--size-touch-target-min) items-center justify-center rounded-pill text-on-hero-surface hover:bg-hero-line", focusRing)}
                >
                  <Icon icon={MenuIcon} size="lg" />
                </button>
              }
            />
          </div>

          <BellButton locale={locale} t={t} unreadCount={unreadCount} unreadDeal={false} panel={bellPanel} onHero />
          <div className="hidden md:flex">
            <ProfileMenu locale={locale} t={t} initials={initials} onHero {...(onSignOut ? { onSignOut } : {})} />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <footer className="shrink-0 border-t border-border bg-surface">
        <p className="mx-auto max-w-(--size-content-max-width) px-4 py-4 text-caption text-text-muted md:px-6">{t("shell.admin.auditNote")}</p>
      </footer>
    </div>
  );
}
