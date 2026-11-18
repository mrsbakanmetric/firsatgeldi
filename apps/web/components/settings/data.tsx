"use client";

// Verilerim ve hesap (design "9 Ayarlar" v2.1 Main + States 2, 4 + Forms 12; modules.md Settings
// and Account, decisions 2026-11-18). Two action cards:
// - "Verilerimi indir": "Dosya hazırla" → prepared in the background ("Dosyan hazırlanıyor · …")
//   → "Dosyan hazır" + "İndir (ZIP)", downloadable `account.export_download_days` (7); the
//   Application Manager's file holds only their own data.
// - "Hesabımı sil": the dialog lists what happens (tracking, tokens and pending requests, the
//   restore date) → "Bunları okudum…" enables the button → re-authentication → closed and signed
//   out → Home with the information banner. Closed for the Application Manager until the role is
//   handed over (the reason is the card's line).
// Users also see their plan summary with "Paketim'e git".
import type { AccountAccess, DataExport, DeletionPreview, EntitlementSummary } from "@firsatgeldi/contracts";
import { formatDate, formatDateTime } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { ActionCard, Button, Checkbox, Dialog, StatusBanner } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { deletionHomeHref } from "../../lib/settings/deletion";
import { useNow } from "../search-add/format";
import { ReauthDialog } from "./access";
import { SectionError, SectionLoading, useMarkSaved } from "./settings";

const DAY_MS = 86_400_000;
/** While a file is being prepared, its state is read again this often. */
const EXPORT_POLL_MS = 2_000;

export function DataSection({ locale, t }: { locale: Locale; t: Translator }) {
  const session = useSession();
  const me = session.status === "ready" ? session.me : null;
  const manager = me?.roles.includes("APP_MANAGER") ?? false;
  const latest = useApiQuery("getLatestExport", {}, { refetchInterval: (query) => (query.state.data?.data.export?.status === "PREPARING" ? EXPORT_POLL_MS : false) });
  const preview = useApiQuery("getDeletionPreview", {});
  const plan = useApiQuery("getEntitlements", {}, { enabled: me !== null && !manager });
  if (!me) return null;
  if (latest.isPending || preview.isPending) return <SectionLoading t={t} />;
  if (latest.isError || preview.isError) {
    return (
      <SectionError
        t={t}
        onRetry={() => {
          void latest.refetch();
          void preview.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <ExportCard locale={locale} t={t} manager={manager} current={latest.data.data.export} />
        <DeleteCard locale={locale} t={t} preview={preview.data.data} />
      </div>
      {!manager && plan.data && <PlanSummary locale={locale} t={t} plan={plan.data.data} />}
    </div>
  );
}

function ExportCard({ locale, t, manager, current }: { locale: Locale; t: Translator; manager: boolean; current: DataExport | null }) {
  const queryClient = useQueryClient();
  const markSaved = useMarkSaved();
  const request = useApiMutation("requestExport", {
    onSuccess: ({ data }) => {
      queryClient.setQueryData(apiQueryKey("getLatestExport", {}), { data: { export: data }, meta: undefined });
      markSaved();
    },
  });
  const link = useApiMutation("getExportLink", { onSuccess: ({ data }) => download(data.url) });
  const prepare = (
    <Button variant="secondary" loading={request.isPending} onClick={() => request.mutate({})}>
      {t("settings.data.prepare")}
    </Button>
  );

  if (current?.status === "READY" && current.readyAt && current.expiresAt) {
    const days = Math.round((new Date(current.expiresAt).getTime() - new Date(current.readyAt).getTime()) / DAY_MS);
    return (
      <ActionCard
        icon={Download}
        title={t("settings.data.readyTitle")}
        text={
          <>
            {t("settings.data.readyText", { count: days, date: formatDateTime(new Date(current.readyAt), locale, { dateStyle: "long", timeStyle: "short" }) })}
            {link.isError && <span className="mt-2 block text-danger">{errorMessage(t, link.error)}</span>}
          </>
        }
        action={
          <Button loading={link.isPending} onClick={() => link.mutate({ params: { id: current.id } })}>
            {t("settings.data.download")}
          </Button>
        }
      />
    );
  }

  return (
    <ActionCard
      icon={Download}
      title={t("settings.data.exportTitle")}
      text={
        <>
          {manager ? t("settings.data.exportTextAdmin") : t("settings.data.exportText")}
          {current?.status === "PREPARING" && (
            <span role="status" className="mt-2 block font-semibold text-text">
              {t("settings.data.preparing")}
            </span>
          )}
          {current?.status === "EXPIRED" && <span className="mt-2 block">{t("settings.data.expired")}</span>}
          {request.isError && <span className="mt-2 block text-danger">{errorMessage(t, request.error)}</span>}
        </>
      }
      action={current?.status === "PREPARING" ? null : prepare}
    />
  );
}

/** Starts the browser download of the short-lived link. */
function download(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  anchor.rel = "noopener";
  anchor.click();
}

function DeleteCard({ locale, t, preview }: { locale: Locale; t: Translator; preview: DeletionPreview }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const blocked = preview.blocked === "ROLE_HANDOVER";
  const days = Math.max(1, Math.round((new Date(preview.restoreUntil).getTime() - now) / DAY_MS));
  return (
    <>
      <ActionCard
        icon={Trash2}
        tone="danger"
        title={t("settings.data.deleteTitle")}
        text={blocked ? t("settings.data.deleteTextAdmin") : t("settings.data.deleteText", { count: days })}
        action={
          <Button variant="secondary" className={blocked ? undefined : "border-danger text-danger hover:bg-danger-subtle"} disabled={blocked} onClick={() => setOpen(true)}>
            {t("settings.data.deleteButton")}
          </Button>
        }
      />
      {!blocked && <DeleteDialog locale={locale} t={t} preview={preview} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

/** States 2: what happens, the "I have read this" checkbox, then re-authentication, then signed out. */
function DeleteDialog({ locale, t, preview, open, onClose }: { locale: Locale; t: Translator; preview: DeletionPreview; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [read, setRead] = useState(false);
  const [reauth, setReauth] = useState(false);
  const access = useApiQuery("getAccess", {}, { enabled: open });
  const remove = useApiMutation("deleteAccount", {
    onSuccess: ({ data }) => {
      // Signed out: every cached read belonged to the closed account.
      queryClient.clear();
      router.push(deletionHomeHref(localizedPath("/", locale), data.purgeAfter));
    },
    onError: (error) => {
      if (error.body.code === "REAUTH_REQUIRED") setReauth(true);
    },
  });
  const close = () => {
    setRead(false);
    remove.reset();
    onClose();
  };
  const restoreDate = formatDate(new Date(preview.restoreUntil), locale, { dateStyle: "long" });
  const consequences = [
    preview.activeTracking > 0 ? t("settings.data.stopsTracking", { count: preview.activeTracking }) : t("settings.data.stopsNotifications"),
    t("settings.data.keepsTokens"),
    t("settings.data.restoreUntil", { date: restoreDate }),
    t("settings.data.purge"),
  ];

  return (
    <>
      <Dialog open={open && !reauth} onClose={close} title={t("settings.data.dialogTitle")} closeLabel={t("common.close")} size="compact">
        <div className="flex flex-col gap-4 p-5">
          <ul className="flex list-disc flex-col gap-2 ps-5 text-body-sm text-text">
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {remove.isError && remove.error.body.code !== "REAUTH_REQUIRED" && <StatusBanner tone="danger">{errorMessage(t, remove.error)}</StatusBanner>}
          <Checkbox label={t("settings.data.confirm")} checked={read} onCheckedChange={setRead} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              {t("settings.cancel")}
            </Button>
            <Button variant="danger" disabled={!read} loading={remove.isPending} onClick={() => remove.mutate({ body: { confirmed: true } })}>
              {t("settings.data.deleteButton")}
            </Button>
          </div>
        </div>
      </Dialog>
      {access.data && (
        <ReauthDialog
          t={t}
          open={reauth}
          access={access.data.data satisfies AccountAccess}
          onClose={() => setReauth(false)}
          onDone={() => {
            setReauth(false);
            remove.mutate({ body: { confirmed: true } });
          }}
        />
      )}
    </>
  );
}

/** "Paketin: Ücretsiz · 1 Göster hakkın ve 3 jetonun var" + "Paketim'e git" (users only). */
function PlanSummary({ locale, t, plan }: { locale: Locale; t: Translator; plan: EntitlementSummary }) {
  const reveals = plan.reveals.limit === null ? t("settings.data.revealsUnlimited") : t("settings.data.reveals", { count: Math.max(0, plan.reveals.limit - plan.reveals.used) });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-5 py-3 text-body-sm text-text">
      <span>
        <strong className="font-semibold">{t("settings.data.plan")}</strong> {t("settings.data.planSummary", { plan: t(`settings.data.plans.${plan.plan}`), reveals, tokens: t("settings.data.tokens", { count: plan.tokenBalance }) })}
      </span>
      <Link href={localizedPath("/paketim", locale)} className="font-semibold text-primary underline underline-offset-4">
        {t("settings.data.planLink")}
      </Link>
    </div>
  );
}
