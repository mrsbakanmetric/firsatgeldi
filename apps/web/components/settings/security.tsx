"use client";

// Güvenlik ve cihazlar (design "9 Ayarlar" v2.1 Main + Forms 7; decisions 2026-11-18):
// signed-in devices without location (this device first, "Bu cihaz"), "Çıkış yap" per device,
// "Diğer cihazlardan çıkış yap" with a confirmation listing the devices — this device stays —
// and the recent sign-ins (failed attempts grouped with their count).
import type { SessionView, SignInView } from "@firsatgeldi/contracts";
import { formatDateTime } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, Dialog, SessionRow, StatusBanner } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { SectionError, SectionLoading, SettingsCard, useMarkSaved } from "./settings";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** Older than this, the date and time are shown instead of "N gün önce". */
const RELATIVE_DAYS = 7;

/** "Şu an etkin" · "N dk / saat / gün önce" · "10 Kas 22:14". */
export function whenText(t: Translator, locale: Locale, iso: string, now: number = Date.now()): string {
  const ago = now - new Date(iso).getTime();
  if (ago < MINUTE_MS) return t("time.justNow");
  if (ago < HOUR_MS) return t("time.minutesAgo", { count: Math.floor(ago / MINUTE_MS) });
  if (ago < DAY_MS) return t("time.hoursAgo", { count: Math.floor(ago / HOUR_MS) });
  if (ago < RELATIVE_DAYS * DAY_MS) return t("time.daysAgo", { count: Math.floor(ago / DAY_MS) });
  return formatDateTime(new Date(iso), locale, { dateStyle: "medium", timeStyle: "short" });
}

export function SecuritySection({ locale, t }: { locale: Locale; t: Translator }) {
  const query = useApiQuery("getSecurity", {});
  const queryClient = useQueryClient();
  const markSaved = useMarkSaved();
  const revoke = useApiMutation("revokeSession");
  const others = useApiMutation("signOutOthers");
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (query.isPending) return <SectionLoading t={t} />;
  if (query.isError) return <SectionError t={t} onRetry={() => void query.refetch()} />;
  const { sessions, signIns } = query.data.data;
  const otherSessions = sessions.filter((row) => !row.current);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: apiQueryKey("getSecurity", {}) });

  return (
    <div className="flex flex-col gap-4">
      {notice && <StatusBanner tone="info">{notice}</StatusBanner>}
      {(revoke.isError || others.isError) && <StatusBanner tone="danger">{errorMessage(t, revoke.error ?? others.error)}</StatusBanner>}
      <SettingsCard
        title={t("settings.security.devices")}
        action={
          otherSessions.length > 0 ? (
            <Button variant="secondary" size="compact" onClick={() => setConfirm(true)}>
              {t("settings.security.signOutOthers")}
            </Button>
          ) : (
            <span className="text-caption text-text-muted">{t("settings.security.noOthers")}</span>
          )
        }
      >
        {sessions.map((row) => (
          <SessionRow
            key={row.id}
            device={row.deviceType}
            title={deviceName(t, row)}
            subtitle={t(`settings.security.device.${row.deviceType}`)}
            when={row.current ? t("settings.security.activeNow") : whenText(t, locale, row.lastUsedAt)}
            end={
              row.current ? (
                <span className="rounded-pill bg-primary-subtle px-2 py-1 text-caption font-semibold text-on-primary-subtle">{t("settings.security.thisDevice")}</span>
              ) : (
                <Button
                  variant="ghost"
                  size="compact"
                  loading={revoke.isPending && revoke.variables?.params.id === row.id}
                  onClick={() =>
                    revoke.mutate(
                      { params: { id: row.id } },
                      {
                        onSuccess: () => {
                          setNotice(t("settings.security.signedOut", { count: 1 }));
                          markSaved();
                          refresh();
                        },
                      },
                    )
                  }
                >
                  {t("settings.security.signOut")}
                </Button>
              )
            }
          />
        ))}
      </SettingsCard>

      <SettingsCard title={t("settings.security.signIns")}>
        {signIns.map((row) => (
          <SessionRow key={row.id} device={row.browser ? row.deviceType : "UNKNOWN"} title={signInTitle(t, row)} subtitle={row.browser && row.os ? deviceName(t, { browser: row.browser, os: row.os }) : t("settings.security.unknownBrowser")} when={whenText(t, locale, row.occurredAt)} />
        ))}
      </SettingsCard>

      <SignOutOthersDialog
        t={t}
        locale={locale}
        open={confirm}
        devices={otherSessions}
        loading={others.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          others.mutate(
            {},
            {
              onSuccess: ({ data }) => {
                setConfirm(false);
                setNotice(t("settings.security.signedOut", { count: data.revoked }));
                markSaved();
                refresh();
              },
            },
          )
        }
      />
    </div>
  );
}

/** "Chrome · Windows". */
function deviceName(t: Translator, row: { browser: string; os: string }): string {
  return [row.browser, row.os].join(t("common.listSeparator"));
}

function signInTitle(t: Translator, row: SignInView): string {
  if (row.outcome === "FAILED") return t("settings.security.failed", { count: row.failedCount ?? 1 });
  const method = t(`settings.security.method.${row.method}`);
  return row.newDevice ? t("settings.security.newDevice", { method }) : method;
}

/** "2 cihazdan çıkış yapılsın mı?" listing the devices; "Bu cihaz açık kalır." (design Forms 7). */
function SignOutOthersDialog({ t, locale, open, devices, loading, onClose, onConfirm }: { t: Translator; locale: Locale; open: boolean; devices: readonly SessionView[]; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={t("settings.security.confirmTitle", { count: devices.length })} closeLabel={t("common.close")} size="compact">
      <div className="flex flex-col gap-4 p-5">
        <ul className="flex flex-col divide-y divide-divider rounded-md border border-border">
          {devices.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
              <span className="font-semibold text-text">{deviceName(t, row)}</span>
              <span className="text-caption text-text-muted">{whenText(t, locale, row.lastUsedAt)}</span>
            </li>
          ))}
        </ul>
        <p className="text-body-sm text-text-muted">{t("settings.security.confirmKeep")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("settings.cancel")}
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {t("settings.security.signOut")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
