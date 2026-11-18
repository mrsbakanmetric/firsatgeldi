"use client";

// Settings and Account — `/[locale]/ayarlar/{section}` (design "9 Ayarlar" v2.1: Main, Forms,
// States; pagedesign.md §3.5, §8.9; modules.md Settings and Account). Settings template inside
// the normal app shell for both roles: title + caption, the section menu (`SettingsNav`: a sticky
// list beside the content, a sticky chip row on phones), the section header with "Kaydedildi",
// then the section. Sections appear by permission; the Application Manager sees the footer line.
// Switches and choices save at once; forms have their own "Kaydet".
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { buttonClasses, EmptyState, PageTemplate, SavedIndicator, SettingsNav, SkeletonBlock, StatusBanner, Button } from "@firsatgeldi/ui";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { createContext, type ReactNode, useContext, useState } from "react";
import { useSession } from "../../lib/api/hooks";
import { signInHref } from "../../lib/auth/next";
import { type SettingsSectionId, settingsHref, visibleSections } from "../../lib/settings/sections";
import { useTranslator } from "../shell/parts";
import { AccessSection } from "./access";
import { LookSection } from "./look";
import { PrivacySection } from "./privacy";
import { ProfileSection } from "./profile";
import { SecuritySection } from "./security";

/** "Kaydedildi · şimdi" in the section header after an auto-save or "Kaydet". */
const SavedContext = createContext<() => void>(() => undefined);
export const useMarkSaved = () => useContext(SavedContext);

export function Settings({ locale, section }: { locale: Locale; section: SettingsSectionId }) {
  const t = useTranslator(locale);
  const session = useSession();
  const [saved, setSaved] = useState<SettingsSectionId | null>(null);

  if (session.status === "loading") return <SettingsLoading t={t} />;
  if (session.status === "error") return <SettingsError t={t} />;
  if (!session.me) {
    return (
      <PageTemplate kind="settings" title={t("settings.title")}>
        <EmptyState
          icon={LogIn}
          title={t("settings.states.signInTitle")}
          description={t("settings.states.signInText")}
          action={
            <Link href={signInHref(locale, settingsHref(locale, section))} className={buttonClasses("primary")}>
              {t("shell.signIn")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }

  const sections = visibleSections(session.me.permissions);
  const admin = session.me.roles.includes("APP_MANAGER");
  const nav = sections.map((entry) => ({ id: entry.id, label: t(`settings.sections.${entry.id}.title`), href: settingsHref(locale, entry.id), icon: entry.icon }));

  return (
    <PageTemplate
      kind="settings"
      title={t("settings.title")}
      caption={t("settings.caption")}
      sectionMenu={<SettingsNav label={t("settings.navLabel")} items={nav} current={section} />}
      {...(admin ? { footnote: t("settings.adminFooter") } : {})}
    >
      <section aria-labelledby="settings-section-title" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="settings-section-title" className="text-h2 text-text">
              {t(`settings.sections.${section}.title`)}
            </h2>
            <p className="text-body-sm text-text-muted">{t(`settings.sections.${section}.sub`)}</p>
          </div>
          {saved === section && <SavedIndicator text={t("settings.saved")} />}
        </div>
        <SavedContext.Provider value={() => setSaved(section)}>
          <SectionBody locale={locale} t={t} section={section} />
        </SavedContext.Provider>
      </section>
    </PageTemplate>
  );
}

function SectionBody({ locale, t, section }: { locale: Locale; t: Translator; section: SettingsSectionId }) {
  switch (section) {
    case "profile":
      return <ProfileSection locale={locale} t={t} />;
    case "access":
      return <AccessSection locale={locale} t={t} />;
    case "security":
      return <SecuritySection locale={locale} t={t} />;
    case "look":
      return <LookSection locale={locale} t={t} />;
    case "privacy":
      return <PrivacySection locale={locale} t={t} />;
  }
}

/** A bordered card; its rows are divided (design: one card per group). */
export function SettingsCard({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3">
          {title && <h3 className="text-body font-semibold text-text">{title}</h3>}
          {action}
        </div>
      )}
      <div className="flex flex-col divide-y divide-divider">{children}</div>
    </div>
  );
}

/** Loading: the menu and the section in the same layout (design States 8). */
export function SettingsLoading({ t }: { t: Translator }) {
  return (
    <PageTemplate
      kind="settings"
      title={t("settings.title")}
      sectionMenu={
        <div className="hidden flex-col gap-3 md:flex">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonBlock key={index} />
          ))}
        </div>
      }
    >
      <span role="status" className="sr-only">
        {t("settings.states.loading")}
      </span>
      <SkeletonBlock shape="title" width="1/3" />
      {[0, 1, 2, 3].map((index) => (
        <SkeletonBlock key={index} shape="card" />
      ))}
    </PageTemplate>
  );
}

/** The section could not load; what was saved still applies (design States 7). */
export function SectionError({ t, onRetry }: { t: Translator; onRetry: () => void }) {
  return (
    <StatusBanner
      tone="danger"
      title={t("settings.states.errorTitle")}
      action={
        <Button variant="secondary" size="compact" onClick={onRetry}>
          {t("settings.states.retry")}
        </Button>
      }
    >
      {t("settings.states.errorBody")}
    </StatusBanner>
  );
}

function SettingsError({ t }: { t: Translator }) {
  return (
    <PageTemplate kind="settings" title={t("settings.title")}>
      <SectionError t={t} onRetry={() => globalThis.location.reload()} />
    </PageTemplate>
  );
}

/** A section's own loading block. */
export function SectionLoading({ t }: { t: Translator }) {
  return (
    <div className="flex flex-col gap-3">
      <span role="status" className="sr-only">
        {t("settings.states.loading")}
      </span>
      <SkeletonBlock shape="card" />
      <SkeletonBlock shape="card" />
    </div>
  );
}
