"use client";

// Bildirimler (design "9 Ayarlar" v2.1 Main; modules.md Settings and Account; decisions
// 2026-11-18): "Nasıl gelsin?" — one by one or one daily digest at `notify.digest_time` —,
// "Hangi saatlerde?" — time slots with the exclusive "Her zaman" —, the daily cap (read-only),
// then the type × channel switches. Combined rows switch both of their types; locked rows
// ("kapatılamaz") cannot change; the Application Manager sees the "Yönetim bildirimleri" group
// first. Every change saves at once ("Kaydedildi"). The only place to edit these preferences.
import type { NotificationPreferences, NotificationRowKey } from "@firsatgeldi/contracts";
import { formatTime, RETURN_REMINDER_DAYS, TRACKING_EXPIRY_NOTICE_DAYS } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { ChannelMatrix, type ChannelMatrixRow, ChoiceCards, StatusBanner, ToggleChips } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { SectionError, SectionLoading, SettingsCard, useMarkSaved } from "./settings";

const SLOTS = ["ALWAYS", "MORNING", "NOON", "EVENING"] as const;
const CHANNELS = ["IN_APP", "EMAIL"] as const;
type Channel = (typeof CHANNELS)[number];
type Slot = (typeof SLOTS)[number];

/** "19:00" → the time in the page's language ("19:00" · "7:00 PM"); the digest runs in the user's local time. */
function digestTime(locale: Locale, value: string): string {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return formatTime(new Date(Date.UTC(2000, 0, 1, hours, minutes)), locale, { timeZone: "UTC" });
}

/** Row texts with their numbers (return window, tracking end notice). */
function rowText(t: Translator, key: NotificationRowKey): string {
  if (key === "RETURN") return t("settings.notifications.rows.RETURN.text", { days: RETURN_REMINDER_DAYS });
  if (key === "TRACKING_EXPIRING") return t("settings.notifications.rows.TRACKING_EXPIRING.text", { days: TRACKING_EXPIRY_NOTICE_DAYS });
  return t(`settings.notifications.rows.${key}.text`);
}

export function NotificationsSection({ locale, t }: { locale: Locale; t: Translator }) {
  const query = useApiQuery("getNotificationPreferences", {});
  const queryClient = useQueryClient();
  const markSaved = useMarkSaved();
  const save = useApiMutation("updateNotificationPreferences", {
    onSuccess: ({ data }) => {
      queryClient.setQueryData(apiQueryKey("getNotificationPreferences", {}), { data, meta: undefined });
      markSaved();
    },
  });
  if (query.isPending) return <SectionLoading t={t} />;
  if (query.isError) return <SectionError t={t} onRetry={() => void query.refetch()} />;
  const prefs: NotificationPreferences = query.data.data;
  const showGroups = prefs.rows.some((row) => row.group === "ADMIN");

  const rows: ChannelMatrixRow[] = prefs.rows.map((row, index) => {
    const firstOfGroup = showGroups && prefs.rows[index - 1]?.group !== row.group;
    return {
      id: row.key,
      title: t(`settings.notifications.rows.${row.key}.title`),
      description: rowText(t, row.key),
      values: { IN_APP: row.inApp, EMAIL: row.email },
      ...(firstOfGroup ? { heading: t(`settings.notifications.groups.${row.group}`) } : {}),
      ...(row.locked ? { lockedLabel: t("settings.notifications.locked") } : {}),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      {save.isError && <StatusBanner tone="danger">{errorMessage(t, save.error)}</StatusBanner>}
      <SettingsCard>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-body-sm font-semibold text-text">{t("settings.notifications.how")}</h3>
            <ChoiceCards
              label={t("settings.notifications.deliveryLabel")}
              className="md:grid-flow-row"
              value={prefs.delivery}
              onValueChange={(value) => save.mutate({ body: { delivery: value as NotificationPreferences["delivery"] } })}
              options={[
                { value: "INSTANT", title: t("settings.notifications.instant"), description: t("settings.notifications.instantText") },
                { value: "DIGEST", title: t("settings.notifications.digest"), description: t("settings.notifications.digestText", { time: digestTime(locale, prefs.digestTime) }) },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-body-sm font-semibold text-text">{t("settings.notifications.when")}</h3>
            <ToggleChips
              label={t("settings.notifications.slotsLabel")}
              allValue="ALWAYS"
              value={prefs.slots}
              options={SLOTS.map((slot) => ({ value: slot, label: t(`settings.notifications.slots.${slot}`) }))}
              onValueChange={(value) => save.mutate({ body: { slots: value as Slot[] } })}
            />
            <p className="text-caption text-text-muted">{t("settings.notifications.urgentNote", { count: RETURN_REMINDER_DAYS })}</p>
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-surface-alt px-3 py-2 text-body-sm">
              <span className="text-text-muted">{t("settings.notifications.cap")}</span>
              <span className="font-semibold text-text tabular-nums">{t("settings.notifications.capValue", { count: prefs.dailyCap.limit, used: prefs.dailyCap.usedToday })}</span>
            </div>
          </div>
        </div>
      </SettingsCard>
      <ChannelMatrix
        label={t("settings.notifications.table")}
        rowHeader={t("settings.notifications.type")}
        channels={CHANNELS.map((id) => ({ id, label: t(`settings.notifications.channels.${id}`) }))}
        rows={rows}
        switchLabel={(row, channel) => t("settings.notifications.switchLabel", { type: row.title, channel: channel.label })}
        onToggle={(key, channel, enabled) => save.mutate({ body: { switches: [{ key: key as NotificationRowKey, channel: channel as Channel, enabled }] } })}
      />
    </div>
  );
}
