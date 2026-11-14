"use client";

// AppShell (pagedesign.md §2.1, product_design_pattern.md §5.21): top bar
// (logo, main navigation, search entry, bell + profile menu or sign-in),
// content, footer; below breakpoint.md a bottom tab bar. Guests inside the app
// see the normal navigation with "Giriş yap"; on the Landing Page they see the
// guest navigation with "Giriş yap" + "Ücretsiz başla".
import type { Locale } from "@firsatgeldi/i18n";
import { buttonClasses, cn, focusRing, Icon, Menu, SkeletonBlock, Tooltip } from "@firsatgeldi/ui";
import { CirclePlus, Compass, House, List, LogIn, Search, UserRound, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_NAV, currentAppSection, hrefFor, isProfileMenuPage, LANDING_NAV, TAB_BAR_IDS, type AppNavId } from "../../lib/shell/navigation";
import { BellButton, Logo, ProfileMenu, profileMenuItems, SiteFooter, SkipLink, useTranslator, type ShellViewer } from "./parts";

const NAV_ICON: Record<AppNavId, LucideIcon> = {
  home: House,
  tracking: List,
  search: CirclePlus,
  discover: Compass,
  savings: Wallet,
};

export interface AppShellProps {
  locale: Locale;
  viewer: ShellViewer;
  /** "landing": guest navigation of the Landing Page, product, legal and help pages. */
  variant?: "app" | "landing";
  /** Content of the bell panel (Notifications, plan step 13). */
  bellPanel?: ReactNode;
  onSignOut?: () => void;
  children: ReactNode;
}

const TOP_LINK_CLASSES =
  "flex min-h-(--size-touch-target-min) min-w-(--size-touch-target-min) shrink-0 items-center gap-2 border-y-(length:--border-width-strong) border-transparent px-3 text-body-sm whitespace-nowrap";

export function AppShell({ locale, viewer, variant = "app", bellPanel, onSignOut, children }: AppShellProps) {
  const t = useTranslator(locale);
  const pathname = usePathname() ?? `/${locale}`;
  const current = currentAppSection(pathname, locale);
  const signedIn = viewer.kind === "user";
  const withTabBar = variant === "app";

  return (
    <div className={cn("flex min-h-dvh flex-col bg-background text-text", withTabBar && "pb-(--size-bottom-nav-height) md:pb-0")}>
      <SkipLink t={t} />
      <header className="sticky top-0 z-(--z-index-sticky) h-(--size-header-height) shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex h-full max-w-(--size-content-max-width) items-center gap-2 px-4 md:gap-6 md:px-6">
          <Logo locale={locale} t={t} />

          {variant === "app" ? (
            <nav aria-label={t("shell.mainNav")} className="hidden h-full min-w-0 items-stretch gap-1 overflow-x-auto md:flex">
              {APP_NAV.map((entry) => {
                const active = entry.id === current;
                // From breakpoint.md to below breakpoint.lg: icon only; the label stays the
                // accessible name (visually hidden) and shows as a Tooltip [DECIDED 2026-11-14].
                return (
                  <Tooltip key={entry.id} text={t(entry.label)} duplicatesLabel bubbleClassName="lg:hidden">
                    <Link
                      href={hrefFor(entry.route, locale)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        TOP_LINK_CLASSES,
                        "justify-center lg:justify-start",
                        active ? "border-b-primary font-semibold text-primary" : "font-medium text-text-muted hover:text-text",
                        focusRing,
                      )}
                    >
                      <Icon icon={NAV_ICON[entry.id]} />
                      <span className="sr-only lg:not-sr-only">{t(entry.label)}</span>
                    </Link>
                  </Tooltip>
                );
              })}
            </nav>
          ) : (
            <nav aria-label={t("shell.mainNav")} className="hidden h-full min-w-0 items-stretch gap-1 md:flex">
              {LANDING_NAV.map((entry) => (
                <Link
                  key={entry.id}
                  href={"hash" in entry ? `${hrefFor(entry.route, locale)}#${entry.hash}` : hrefFor(entry.route, locale)}
                  className={cn(TOP_LINK_CLASSES, "font-medium text-text-muted hover:text-text", focusRing)}
                >
                  {t(entry.label)}
                </Link>
              ))}
            </nav>
          )}

          {variant === "app" ? null : <div className="flex-1" />}

          {variant === "app" && (
            <>
              <form role="search" action={hrefFor("/ara", locale)} className="hidden min-w-0 flex-1 md:flex">
                <label className="flex h-(--size-touch-target-min) w-full min-w-0 items-center gap-2 rounded-pill border border-border bg-surface-alt px-3 text-text-muted focus-within:border-primary">
                  <Icon icon={Search} />
                  <span className="sr-only">{t("shell.search.label")}</span>
                  <input type="search" name="q" placeholder={t("shell.search.placeholder")} className="min-w-0 flex-1 bg-transparent text-body-sm text-text outline-none placeholder:text-text-muted" />
                </label>
              </form>
              <div className="flex-1 md:hidden" />
              <Link
                href={hrefFor("/ara", locale)}
                aria-label={t("shell.search.open")}
                className={cn("flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill text-text hover:bg-surface-alt md:hidden", focusRing)}
              >
                <Icon icon={Search} size="lg" />
              </Link>
            </>
          )}

          {viewer.kind === "loading" ? (
            // Same place as the account controls, nothing readable: no "Giriş yap" flash while the session loads.
            <span aria-hidden="true" data-testid="session-placeholder" className="flex h-(--size-touch-target-min) w-16 shrink-0 items-center">
              <SkeletonBlock shape="pill" />
            </span>
          ) : signedIn ? (
            <>
              <BellButton locale={locale} t={t} unreadCount={viewer.unreadCount} unreadDeal={viewer.unreadDeal} panel={bellPanel} />
              <div className="hidden md:flex">
                <ProfileMenu locale={locale} t={t} initials={viewer.initials} {...(onSignOut ? { onSignOut } : {})} />
              </div>
            </>
          ) : variant === "landing" ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link href={hrefFor("/giris", locale)} className={buttonClasses("ghost", "hidden md:inline-flex")}>
                {t("shell.signIn")}
              </Link>
              <Link href={hrefFor("/giris", locale)} className={buttonClasses("primary")}>
                {t("shell.startFree")}
              </Link>
            </div>
          ) : (
            <Link href={hrefFor("/giris", locale)} className={buttonClasses("secondary", "shrink-0")}>
              {t("shell.signIn")}
            </Link>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <SiteFooter locale={locale} t={t} />

      {withTabBar && (
        <nav
          aria-label={t("shell.mainNav")}
          className="fixed inset-x-0 bottom-0 z-(--z-index-sticky) grid h-(--size-bottom-nav-height) grid-cols-5 border-t border-border bg-surface md:hidden"
        >
          {APP_NAV.filter((entry) => (TAB_BAR_IDS as readonly string[]).includes(entry.id)).map((entry) => (
            <TabLink key={entry.id} href={hrefFor(entry.route, locale)} icon={NAV_ICON[entry.id]} label={t(entry.label)} active={entry.id === current} />
          ))}
          {viewer.kind === "loading" ? (
            <span aria-hidden="true" className={tabClasses(false)}>
              <SkeletonBlock shape="pill" width="1/2" />
            </span>
          ) : signedIn ? (
            <Menu
              label={t("shell.profileMenu.button")}
              items={profileMenuItems(locale, t, pathname, onSignOut)}
              trigger={
                <button type="button" aria-current={isProfileMenuPage(pathname, locale) ? "page" : undefined} className={tabClasses(isProfileMenuPage(pathname, locale))}>
                  <Icon icon={UserRound} />
                  <span>{t("shell.nav.profile")}</span>
                </button>
              }
            />
          ) : (
            <TabLink href={hrefFor("/giris", locale)} icon={LogIn} label={t("shell.nav.signIn")} active={false} />
          )}
        </nav>
      )}
    </div>
  );
}

function tabClasses(active: boolean): string {
  return cn(
    "flex min-h-(--size-touch-target-min) min-w-0 flex-col items-center justify-center gap-1 border-t-(length:--border-width-strong) px-1 text-center text-caption",
    active ? "border-primary font-semibold text-primary" : "border-transparent font-medium text-text-muted",
    focusRing,
  );
}

function TabLink({ href, icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={tabClasses(active)}>
      <Icon icon={icon} />
      <span>{label}</span>
    </Link>
  );
}
