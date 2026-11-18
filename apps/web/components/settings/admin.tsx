"use client";

// Application Manager sections (design "9 Ayarlar" v2.1 AdminMain + Forms 11; modules.md
// Settings and Account, decisions 2026-11-18). Both read-only and closed on the server for
// everyone else:
// - Yetkilerim: the role card (+ link to Roles and Permissions) and the official permission keys
//   by group with "N / N yetki".
// - Yönetim etkinliğim: the manager's own audit entries — hidden-seller views, personal-data
//   reveals with reason and duration, setting changes, user actions — with search and a type
//   filter with counts; product entries show the product image. Empty: "Henüz yönetim işlemin
//   yok" + "Genel bakışa git"; the full log is the Audit Log screen.
import type { AdminActivity, AdminActivityItem, OwnPermissions } from "@firsatgeldi/contracts";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, EmptyState, FilterChips, Icon, PermissionGroup, ProductImage, RoleCard, SearchField } from "@firsatgeldi/ui";
import { Eye, type LucideIcon, Package, ScrollText, ShieldCheck, SlidersHorizontal, UserCog } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useApiQuery } from "../../lib/api/hooks";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { whenText } from "./security";
import { SectionError, SectionLoading, SettingsCard } from "./settings";

// ── Yetkilerim ───────────────────────────────────────────────────────────────

const GROUPS = ["self", "users", "catalog", "packages", "system", "security", "content"] as const;
type GroupId = (typeof GROUPS)[number];
const isGroup = (id: string): id is GroupId => (GROUPS as readonly string[]).includes(id);

export function PermissionsSection({ locale, t }: { locale: Locale; t: Translator }) {
  const query = useApiQuery("getOwnPermissions", {});
  if (query.isPending) return <SectionLoading t={t} />;
  if (query.isError) return <SectionError t={t} onRetry={() => void query.refetch()} />;
  const own: OwnPermissions = query.data.data;
  return (
    <div className="flex flex-col gap-4">
      <RoleCard
        icon={ShieldCheck}
        title={t(`settings.permissions.roles.${own.role}`)}
        text={own.role === "APP_MANAGER" ? t("settings.permissions.managerLine", { count: own.holders }) : t(`settings.permissions.roles.${own.role}`)}
        link={{ href: localizedPath("/admin/roller", locale), label: t("settings.permissions.link") }}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {own.groups.filter((group) => group.total > 0 && isGroup(group.id)).map((group) => (
          <PermissionGroup key={group.id} title={t(`settings.permissions.groups.${group.id as GroupId}`)} count={t("settings.permissions.count", { granted: group.granted.length, total: group.total })} keys={group.granted} />
        ))}
      </div>
      <p className="text-caption text-text-muted">{t("settings.permissions.footnote")}</p>
    </div>
  );
}

// ── Yönetim etkinliğim ───────────────────────────────────────────────────────

const TYPES = ["ALL", "HIDDEN_SELLER", "PII", "SETTING", "USER_ACTION"] as const;
type TypeFilter = (typeof TYPES)[number];

const TYPE_ICONS: Record<AdminActivityItem["type"], LucideIcon> = { HIDDEN_SELLER: Package, PII: Eye, SETTING: SlidersHorizontal, USER_ACTION: UserCog };
const TAG_CLASSES: Record<AdminActivityItem["type"], string> = {
  HIDDEN_SELLER: "bg-warning-subtle text-on-warning-subtle",
  PII: "bg-danger-subtle text-danger",
  SETTING: "bg-info-subtle text-info",
  USER_ACTION: "bg-surface-alt text-text",
};
/** Setting keys with a name in the catalogue; others show their key. */
const SETTING_NAMES: Readonly<Record<string, "dailyCap" | "revealOpenHours">> = { "notify.daily_cap": "dailyCap", "reveal.open_hours": "revealOpenHours" };

export function ActivitySection({ locale, t }: { locale: Locale; t: Translator }) {
  const [text, setText] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const q = useDeferredValue(text.trim());
  const query = useApiQuery("getAdminActivity", { query: { ...(q ? { q } : {}), ...(type === "ALL" ? {} : { type }) } }, { placeholderData: (previous) => previous });
  if (query.isPending) return <SectionLoading t={t} />;
  if (query.isError) return <SectionError t={t} onRetry={() => void query.refetch()} />;
  const activity: AdminActivity = query.data.data;
  const filtered = q !== "" || type !== "ALL";

  if (activity.items.length === 0 && !filtered) {
    return (
      <EmptyState
        icon={ScrollText}
        title={t("settings.activity.emptyTitle")}
        description={t("settings.activity.emptyText")}
        action={
          <Link href={localizedPath("/admin", locale)} className={buttonClasses("primary")}>
            {t("settings.activity.emptyAction")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchField
        size="list"
        label={t("settings.activity.search")}
        hideLabel
        placeholder={t("settings.activity.placeholder")}
        value={text}
        onChange={(event) => setText(event.target.value)}
        clearLabel={t("settings.activity.clear")}
        onClear={() => setText("")}
      />
      <FilterChips label={t("settings.activity.typesLabel")} options={TYPES.map((id) => ({ id, label: t(`settings.activity.types.${id}`), count: activity.facets.types[id] }))} value={type} onChange={setType} />

      {activity.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5">
          <p className="text-body font-semibold text-text">{t("settings.activity.noResults")}</p>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => {
              setText("");
              setType("ALL");
            }}
          >
            {t("settings.activity.clear")}
          </Button>
        </div>
      ) : (
        <SettingsCard>
          <ul className="flex flex-col divide-y divide-divider">
            {activity.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 md:flex-nowrap">
                {item.subject.kind === "PRODUCT" ? (
                  <ProductImage src={imageUrl(item.subject.imageSha256)} alt={item.subject.name} size="sm" fallbackIcon={Package} />
                ) : (
                  <span aria-hidden="true" className="flex size-(--size-thumb-sm) shrink-0 items-center justify-center rounded-md bg-surface-alt text-text">
                    <Icon icon={TYPE_ICONS[item.type]} />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-sm font-semibold text-text">{entryTitle(t, item)}</span>
                  <span className="text-caption text-text-muted">{entryDetail(t, item)}</span>
                </div>
                <span className={cn("shrink-0 rounded-pill px-2 py-1 text-caption font-semibold", TAG_CLASSES[item.type])}>{t(`settings.activity.tags.${item.type}`)}</span>
                <span className="shrink-0 text-caption text-text-muted">{whenText(t, locale, item.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}
      <p className="text-caption text-text-muted">{t("settings.activity.footnote")}</p>
    </div>
  );
}

/** "Gizli satıcıyı gördü · Insta360 Ace Pro 2" · "Kişisel veri gösterildi · e-posta" · "Ayar değişti · …". */
function entryTitle(t: Translator, item: AdminActivityItem): string {
  const subject = item.subject;
  if (item.action === "hidden_seller.view" && subject.kind === "PRODUCT") return t("settings.activity.actions.hiddenSeller", { product: subject.name });
  if (item.action === "pii_reveal.email") return t("settings.activity.actions.piiEmail");
  if (item.action === "pii_reveal.phone") return t("settings.activity.actions.piiPhone");
  if (subject.kind === "SETTING") return t("settings.activity.actions.setting", { setting: settingName(t, subject.key) });
  if (item.action === "user.suspend") return t("settings.activity.actions.suspend");
  return t("settings.activity.actions.generic");
}

/** "Kullanıcı #48213 · gerekçe: #912 · 10 dk açık kaldı" · "4 → 5 · Sistem Ayarları". */
function entryDetail(t: Translator, item: AdminActivityItem): string {
  const subject = item.subject;
  if (subject.kind === "SETTING") return t("settings.activity.change", { from: subject.from, to: subject.to });
  const parts = [
    subject.kind === "USER" ? t("settings.activity.user", { number: subject.userNumber }) : null,
    item.reasonRef ? t("settings.activity.reason", { reason: item.reasonRef }) : null,
    item.openMinutes ? t("settings.activity.openFor", { count: item.openMinutes }) : null,
  ];
  return parts.filter((part): part is string => part !== null).join(t("common.listSeparator"));
}

function settingName(t: Translator, key: string): string {
  const name = SETTING_NAMES[key];
  return name ? t(`settings.activity.settingNames.${name}`) : key;
}
