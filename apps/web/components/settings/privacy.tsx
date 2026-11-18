"use client";

// Gizlilik ve çerezler (design "9 Ayarlar" v2.1): cookie switches — necessary locked on,
// analytics and marketing off until chosen (each change is a consent record) — and the profile
// visibility Herkese açık · Takipçilerime · Sadece ben (default Sadece ben [DECIDED 2026-11-18]);
// both save at once ("Kaydedildi"). Links to the KVKK notice and the cookie policy.
import type { Me } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { SegmentedChoice, Switch } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiQueryKey, useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { hrefFor } from "../../lib/shell/navigation";
import { useSetMe } from "./profile";
import { SectionError, SectionLoading, SettingsCard, useMarkSaved } from "./settings";

const LEVELS = ["EVERYONE", "FOLLOWERS", "ONLY_ME"] as const satisfies readonly Me["privacyLevel"][];

export function PrivacySection({ locale, t }: { locale: Locale; t: Translator }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const markSaved = useMarkSaved();
  const setMe = useSetMe();
  const consent = useApiQuery("getCookieConsent", {});
  const saveConsent = useApiMutation("updateCookieConsent");
  const saveMe = useApiMutation("updateMe");
  const me = session.status === "ready" ? session.me : null;
  if (!me) return null;
  if (consent.isPending) return <SectionLoading t={t} />;
  if (consent.isError) return <SectionError t={t} onRetry={() => void consent.refetch()} />;
  const choice = consent.data.data;

  const setCookie = (key: "analytics" | "marketing", value: boolean) =>
    saveConsent.mutate(
      { body: { analytics: key === "analytics" ? value : choice.analytics, marketing: key === "marketing" ? value : choice.marketing } },
      {
        onSuccess: ({ data }) => {
          queryClient.setQueryData(apiQueryKey("getCookieConsent", {}), { data, meta: undefined });
          markSaved();
        },
      },
    );

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard title={t("settings.privacy.cookies")}>
        <div className="flex flex-col gap-4 p-5">
          <Switch label={t("settings.privacy.necessary")} description={t("settings.privacy.necessaryText")} checked lockedReason={t("settings.privacy.necessaryLocked")} onCheckedChange={() => undefined} />
          <Switch label={t("settings.privacy.analytics")} description={t("settings.privacy.analyticsText")} checked={choice.analytics} onCheckedChange={(value) => setCookie("analytics", value)} />
          <Switch label={t("settings.privacy.marketing")} description={t("settings.privacy.marketingText")} checked={choice.marketing} onCheckedChange={(value) => setCookie("marketing", value)} />
        </div>
      </SettingsCard>
      <SettingsCard title={t("settings.privacy.visibility")}>
        <div className="p-5">
          <SegmentedChoice
            label={t("settings.privacy.visibility")}
            options={LEVELS.map((value) => ({ value, label: t(`settings.privacy.levels.${value}`) }))}
            value={me.privacyLevel}
            onValueChange={(value) => saveMe.mutate({ body: { privacyLevel: value as Me["privacyLevel"] } }, { onSuccess: ({ data }) => (setMe(data), markSaved()) })}
          />
        </div>
      </SettingsCard>
      <div className="flex flex-wrap gap-4 text-body-sm">
        <Link href={hrefFor("/kvkk", locale)} className="font-semibold text-primary underline underline-offset-4">
          {t("settings.privacy.kvkk")}
        </Link>
        <Link href={hrefFor("/cerezler", locale)} className="font-semibold text-primary underline underline-offset-4">
          {t("settings.privacy.cookiePolicy")}
        </Link>
      </div>
    </div>
  );
}
