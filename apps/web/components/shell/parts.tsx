"use client";

// Building blocks shared by AppShell, AuthShell and AdminShell (pagedesign.md §2).
import { createTranslator, localizedPath, LOCALES, type Locale, type Translator } from "@firsatgeldi/i18n";
import { Avatar, cn, focusRing, Icon, Menu, Sheet, type MenuItem } from "@firsatgeldi/ui";
import { ArrowDown, Bell, CreditCard, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { writeLocalePreference } from "../../lib/i18n/locale-preference";
import { AUTH_FOOTER_IDS, DEFAULT_SETTINGS_SECTION, FOOTER_LINKS, hrefFor, isProfileMenuPage, isWithin, settingsBase, switchLocalePath } from "../../lib/shell/navigation";

export function useTranslator(locale: Locale): Translator {
  return useMemo(() => createTranslator(locale), [locale]);
}

/** Who is looking at the shell. The session itself arrives with the mock API (plan step 9). */
export type ShellViewer = { kind: "guest" } | { kind: "user"; initials: string; unreadCount: number; unreadDeal: boolean };

export function SkipLink({ t }: { t: Translator }) {
  return (
    <a
      href="#main"
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-index-tooltip) focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-body focus:text-primary",
        focusRing,
      )}
    >
      {t("shell.skipToContent")}
    </a>
  );
}

export function Logo({ locale, t, onHero = false }: { locale: Locale; t: Translator; onHero?: boolean }) {
  return (
    <Link href={hrefFor("/", locale)} className={cn("flex shrink-0 items-center gap-2 rounded-md", onHero ? "text-on-hero-surface" : "text-text", focusRing)}>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-on-primary">
        <Icon icon={ArrowDown} />
      </span>
      <span className="text-h3 font-bold">{t("app.name")}</span>
    </Link>
  );
}

/** Türkçe · English: the same page in the other language; remembers the explicit choice. */
export function LanguageSwitch({ locale, t, onHero = false }: { locale: Locale; t: Translator; onHero?: boolean }) {
  const pathname = usePathname() ?? `/${locale}`;
  return (
    <nav aria-label={t("shell.language.label")} className="flex items-center gap-1">
      {LOCALES.map((target) => {
        const current = target === locale;
        return (
          <Link
            key={target}
            href={switchLocalePath(pathname, locale, target)}
            hrefLang={target}
            lang={target}
            aria-current={current ? "true" : undefined}
            onClick={() => writeLocalePreference(target)}
            className={cn(
              "flex min-h-(--size-touch-target-min) items-center rounded-md px-2 text-caption",
              current ? "font-semibold" : "font-medium underline underline-offset-4",
              onHero ? "text-on-hero-surface" : current ? "text-text" : "text-text-muted hover:text-text",
              focusRing,
            )}
          >
            {t(`shell.language.${target}`)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Footer: legal links, help, commission note, language switch. Short labels on phones. */
export function SiteFooter({ locale, t, variant = "full" }: { locale: Locale; t: Translator; variant?: "full" | "auth" }) {
  const links = variant === "auth" ? FOOTER_LINKS.filter((link) => (AUTH_FOOTER_IDS as readonly string[]).includes(link.id)) : FOOTER_LINKS;
  return (
    <footer className="shrink-0 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-(--size-content-max-width) flex-col gap-3 px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:p-6">
        <nav aria-label={t("shell.footer.label")} className="flex flex-wrap gap-x-3 gap-y-1 md:gap-5">
          {links.map((link) => (
            <Link
              key={link.id}
              href={hrefFor(link.route, locale)}
              className={cn("flex min-h-(--size-touch-target-min) items-center rounded-sm text-caption text-text-muted underline-offset-4 hover:underline md:text-body-sm", focusRing)}
            >
              <span className="md:hidden">{t(link.short)}</span>
              <span className="hidden md:inline">{t(link.label)}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          {variant === "full" && <p className="text-caption text-text-muted">{t("shell.footer.commissionNote")}</p>}
          <LanguageSwitch locale={locale} t={t} />
        </div>
      </div>
    </footer>
  );
}

/** Bell with its counter (coral only for an unread deal) and the notification panel. */
export function BellButton({ locale, t, unreadCount, unreadDeal, panel, onHero = false }: {
  locale: Locale;
  t: Translator;
  unreadCount: number;
  unreadDeal: boolean;
  panel?: ReactNode;
  onHero?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = unreadCount > 0 ? t("shell.bell.unread", { count: unreadCount }) : t("shell.bell.label");
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill",
          onHero ? "text-on-hero-surface hover:bg-hero-line" : "text-text hover:bg-surface-alt",
          focusRing,
        )}
      >
        <Icon icon={Bell} size="lg" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-pill px-1 text-caption font-semibold tabular-nums",
              unreadDeal && !onHero ? "bg-accent text-on-accent" : "bg-text text-text-inverse",
              onHero && "bg-on-hero-surface text-hero-surface",
            )}
          >
            {unreadCount}
          </span>
        )}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("shell.bell.panelTitle")}
        closeLabel={t("common.closePanel")}
        footer={
          <Link href={hrefFor("/bildirimler", locale)} onClick={() => setOpen(false)} className={cn("text-body font-semibold text-primary underline-offset-4 hover:underline", focusRing)}>
            {t("shell.bell.seeAll")}
          </Link>
        }
      >
        {panel}
      </Sheet>
    </>
  );
}

export function profileMenuItems(locale: Locale, t: Translator, pathname: string, onSignOut?: () => void): MenuItem[] {
  const settings = localizedPath("/ayarlar/[section]", locale, { section: DEFAULT_SETTINGS_SECTION });
  const items: MenuItem[] = [
    { id: "profile", label: t("shell.profileMenu.profile"), icon: UserRound, href: hrefFor("/profil", locale), current: pathname === hrefFor("/profil", locale) },
    { id: "plan", label: t("shell.profileMenu.plan"), icon: CreditCard, href: hrefFor("/paketim", locale), current: pathname === hrefFor("/paketim", locale) },
    { id: "settings", label: t("shell.profileMenu.settings"), icon: Settings, href: settings, current: isWithin(pathname, settingsBase(locale), locale) },
  ];
  if (onSignOut) items.push({ id: "sign-out", label: t("shell.profileMenu.signOut"), icon: LogOut, onSelect: onSignOut });
  return items;
}

/** Avatar menu at the right end of the top bar (from breakpoint.md). */
export function ProfileMenu({ locale, t, initials, onSignOut, onHero = false }: {
  locale: Locale;
  t: Translator;
  initials: string;
  onSignOut?: () => void;
  onHero?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const current = isProfileMenuPage(pathname, locale);
  return (
    <Menu
      label={t("shell.profileMenu.button")}
      items={profileMenuItems(locale, t, pathname, onSignOut)}
      trigger={
        <button
          type="button"
          aria-current={current ? "page" : undefined}
          className={cn(
            "flex h-(--size-touch-target-min) shrink-0 items-center gap-2 rounded-pill pr-2 pl-1 text-body-sm font-semibold",
            current ? "border-(length:--border-width-strong) border-primary" : "border border-border",
            onHero ? "bg-transparent text-on-hero-surface" : "bg-surface text-text",
            focusRing,
          )}
        >
          <Avatar initials={initials} size="sm" />
          <span>{t("shell.profileMenu.buttonText")}</span>
        </button>
      }
    />
  );
}
