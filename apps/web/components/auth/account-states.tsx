"use client";

// Account states after a correct password only (design "8 Giriş" v2.1 States 3, 5, 6;
// architecture.md §17 [DECIDED 2026-11-18]): e-mail not verified · pending deletion
// ("Hesabımı geri aç" / "Vazgeç, silinsin", never restored automatically) · suspended
// (reason, "Destek talebi aç", "Verilerimi indir"; no entry into the app). The
// short-lived challenge from the sign-in answer is all these actions carry.
import type { Me } from "@firsatgeldi/contracts";
import { formatDate } from "@firsatgeldi/core";
import type { Locale, TranslationKey, Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, StatusBanner } from "@firsatgeldi/ui";
import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApiMutation } from "../../lib/api/hooks";
import { hrefFor } from "../../lib/shell/navigation";

export type AccountView =
  | { kind: "unverified"; email: string; emailMasked: string }
  | { kind: "pendingDeletion"; challenge: string; requestedAt: string; purgeAfter: string }
  | { kind: "suspended"; challenge: string; reasonKey: string };

export interface AccountStateProps {
  locale: Locale;
  t: Translator;
  view: AccountView;
  onSignedIn: (me: Me) => void;
  onVerifySent: (email: string, emailMasked: string, resendAfterSeconds: number) => void;
  /** Back to the form; with the purge date after "Vazgeç, silinsin". */
  onBack: (keptUntil?: string) => void;
}

const longDate = (iso: string, locale: Locale) => formatDate(new Date(iso), locale, { dateStyle: "long" });

export function AccountState({ locale, t, view, onSignedIn, onVerifySent, onBack }: AccountStateProps) {
  if (view.kind === "unverified") return <Unverified t={t} view={view} onVerifySent={onVerifySent} onBack={onBack} />;
  if (view.kind === "pendingDeletion") return <PendingDeletion locale={locale} t={t} view={view} onSignedIn={onSignedIn} onBack={onBack} />;
  return <Suspended locale={locale} t={t} view={view} onBack={onBack} />;
}

function Unverified({ t, view, onVerifySent, onBack }: { t: Translator; view: Extract<AccountView, { kind: "unverified" }>; onVerifySent: AccountStateProps["onVerifySent"]; onBack: AccountStateProps["onBack"] }) {
  const resend = useApiMutation("resendVerification");
  return (
    <div className="flex flex-col gap-4">
      <StatusBanner tone="info" icon={Mail} title={t("auth.unverified.title")}>
        {t("auth.unverified.body", { email: view.emailMasked })}
      </StatusBanner>
      {resend.isError && (
        <StatusBanner tone="danger" title={t("auth.unavailable.title")}>
          {t("auth.unavailable.body")}
        </StatusBanner>
      )}
      <Button
        className="w-full"
        loading={resend.isPending}
        onClick={() => resend.mutate({ body: { email: view.email } }, { onSuccess: ({ data }) => onVerifySent(view.email, data.emailMasked, data.resendAfterSeconds) })}
      >
        {t("auth.unverified.resend")}
      </Button>
      <Button variant="link" className="self-center" onClick={() => onBack()}>
        {t("auth.unverified.otherEmail")}
      </Button>
    </div>
  );
}

function PendingDeletion({ locale, t, view, onSignedIn, onBack }: { locale: Locale; t: Translator; view: Extract<AccountView, { kind: "pendingDeletion" }>; onSignedIn: AccountStateProps["onSignedIn"]; onBack: AccountStateProps["onBack"] }) {
  const restore = useApiMutation("restoreAccount");
  const keep = useApiMutation("keepDeletion");
  const body = { body: { challenge: view.challenge } };
  // An expired choice (UNAUTHENTICATED) goes back to the form: the user signs in again.
  const expired = () => onBack();
  return (
    <div className="flex flex-col gap-4">
      <StatusBanner tone="warning" title={t("auth.pendingDeletion.title", { date: longDate(view.purgeAfter, locale) })}>
        {t("auth.pendingDeletion.body", { requested: longDate(view.requestedAt, locale) })}
      </StatusBanner>
      <Button
        className="w-full"
        loading={restore.isPending}
        disabled={keep.isPending}
        onClick={() => restore.mutate(body, { onSuccess: ({ data }) => (data.status === "SIGNED_IN" ? onSignedIn(data.me) : onBack()), onError: expired })}
      >
        {t("auth.pendingDeletion.restore")}
      </Button>
      <Button
        variant="link"
        className="self-center"
        disabled={restore.isPending || keep.isPending}
        onClick={() => keep.mutate(body, { onSuccess: ({ data }) => onBack(data.purgeAfter), onError: expired })}
      >
        {t("auth.pendingDeletion.keep")}
      </Button>
    </div>
  );
}

function Suspended({ locale, t, view, onBack }: { locale: Locale; t: Translator; view: Extract<AccountView, { kind: "suspended" }>; onBack: AccountStateProps["onBack"] }) {
  const exportData = useApiMutation("exportSuspendedAccount");
  const [started, setStarted] = useState(false);
  const reasonKey = `auth.suspended.reasons.${view.reasonKey}` as TranslationKey;
  let reason: string;
  try {
    reason = t(reasonKey);
  } catch {
    reason = t("auth.suspended.reasons.OTHER");
  }
  return (
    <div className="flex flex-col gap-4">
      <StatusBanner tone="danger" icon={Lock} title={t("auth.suspended.title")}>
        {t("auth.suspended.reason", { reason })}
      </StatusBanner>
      {started && <StatusBanner tone="info">{t("auth.suspended.exportStarted")}</StatusBanner>}
      <Link href={hrefFor("/yardim/iletisim", locale)} className={buttonClasses("primary", "w-full")}>
        {t("auth.suspended.support")}
      </Link>
      {!started && (
        <Button
          variant="link"
          className="self-center"
          loading={exportData.isPending}
          onClick={() => exportData.mutate({ body: { challenge: view.challenge } }, { onSuccess: () => setStarted(true), onError: () => onBack() })}
        >
          {t("auth.suspended.export")}
        </Button>
      )}
    </div>
  );
}
