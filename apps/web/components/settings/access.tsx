"use client";

// E-posta ve şifre (design "9 Ayarlar" v2.1 Main + Forms 1–3, 5, 6, 8; States 1, 3;
// decisions 2026-11-18): masked e-mail and phone with a timed "Göster" (re-authentication
// valid 15 minutes — the password, or the Google / Apple button for an account without one;
// the full value shows 60 seconds, then masks itself; every reveal is logged by the server);
// e-mail change in a dialog (the old address stays valid until verified); phone shown only;
// password change (the other devices are signed out) or "Şifre oluştur" by e-mail link;
// linked Google / Apple (the only sign-in method cannot be removed); the Application
// Manager's two-step verification as an information row.
import { type AccountAccess, type ApiError, type Provider } from "@firsatgeldi/contracts";
import { formatDate } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, Dialog, EmailSentBlock, MaskedValue, PasswordRules, ProviderButton, SettingRow, StatusBanner, TextField } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Link2, Mail, Phone, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { useApiClient } from "../../lib/api/provider";
import { clock, useSecondsLeft } from "../../lib/auth/countdown";
import { isEmail, ProviderMark, ruleList, useAuthPolicy } from "../auth/shared";
import { SectionError, SectionLoading, SettingsCard, useMarkSaved } from "./settings";

const SECOND_MS = 1000;
/** A set password is never shown, only this mark. */
const PASSWORD_DOTS = "••••••••";
const PROVIDERS: readonly Provider[] = ["GOOGLE", "APPLE"];
const PROVIDER_PATH = { GOOGLE: "google", APPLE: "apple" } as const;

type Field = "email" | "phone";
/** What waits for a fresh re-authentication. */
type AfterReauth = { kind: "reveal"; field: Field } | { kind: "changeEmail" } | null;

function useSetAccess() {
  const queryClient = useQueryClient();
  return (access: AccountAccess) => queryClient.setQueryData(apiQueryKey("getAccess", {}), { data: access, meta: undefined });
}

export function AccessSection({ locale, t }: { locale: Locale; t: Translator }) {
  const query = useApiQuery("getAccess", {});
  if (query.isPending) return <SectionLoading t={t} />;
  if (query.isError) return <SectionError t={t} onRetry={() => void query.refetch()} />;
  return <AccessRows locale={locale} t={t} access={query.data.data} />;
}

function AccessRows({ locale, t, access }: { locale: Locale; t: Translator; access: AccountAccess }) {
  const client = useApiClient();
  const session = useSession();
  const markSaved = useMarkSaved();
  const setAccess = useSetAccess();
  const [revealed, setRevealed] = useState<{ field: Field; value: string; until: number } | null>(null);
  const [revealing, setRevealing] = useState<Field | null>(null);
  const [afterReauth, setAfterReauth] = useState<AfterReauth>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [unlink, setUnlink] = useState<Provider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const left = useSecondsLeft(revealed?.until ?? null);
  // The value masks itself again when the countdown ends.
  const shown = revealed && left > 0 ? revealed : null;
  const reauthLeft = useSecondsLeft(access.reauthUntil ? new Date(access.reauthUntil).getTime() : null);
  const reauthValid = reauthLeft > 0;

  const reveal = async (field: Field) => {
    setRevealing(field);
    setProblem(null);
    try {
      const { data } = await client.call("getOwnPii", {});
      const value = field === "email" ? data.email : data.phone;
      if (value) setRevealed({ field, value, until: new Date(data.visibleUntil).getTime() });
    } catch (error) {
      if ((error as ApiError).body?.code === "REAUTH_REQUIRED") ask({ kind: "reveal", field });
      else setProblem(errorMessage(t, error));
    } finally {
      setRevealing(null);
    }
  };
  const ask = (next: AfterReauth) => {
    setAfterReauth(next);
    setReauthOpen(true);
  };
  const afterReauthDone = () => {
    setReauthOpen(false);
    const next = afterReauth;
    setAfterReauth(null);
    if (next?.kind === "reveal") void reveal(next.field);
    if (next?.kind === "changeEmail") setEmailOpen(true);
  };

  const createLink = useApiMutation("createPasswordLink");
  const link = useApiMutation("linkIdentity");
  const resend = useApiMutation("resendEmailChange");
  const cancel = useApiMutation("cancelEmailChange");
  const resendLeft = useSecondsLeft(access.pendingEmail ? new Date(access.pendingEmail.sentAt).getTime() + access.pendingEmail.resendAfterSeconds * SECOND_MS : null);

  const linked = access.identities.filter((row) => row.linked).map((row) => row.provider);
  const viaProvider = linked[0] ?? null;
  const onlyMethod = (provider: Provider) => !access.password.set && linked.length === 1 && linked[0] === provider;
  const admin = session.status === "ready" && session.me?.roles.includes("APP_MANAGER");

  return (
    <div className="flex flex-col gap-4">
      {notice && <StatusBanner tone="info">{notice}</StatusBanner>}
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      {access.pendingEmail && (
        <StatusBanner
          tone="info"
          icon={Mail}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="compact" disabled={resendLeft > 0} loading={resend.isPending} onClick={() => resend.mutate({}, { onSuccess: ({ data }) => setAccess(data), onError: (error) => setProblem(errorMessage(t, error)) })}>
                {resendLeft > 0 ? t("settings.access.resendIn", { time: clock(resendLeft) }) : t("settings.access.resend")}
              </Button>
              <Button variant="ghost" size="compact" loading={cancel.isPending} onClick={() => cancel.mutate({}, { onSuccess: ({ data }) => (setAccess(data), markSaved()) })}>
                {t("settings.access.cancelChange")}
              </Button>
            </div>
          }
        >
          {t("settings.access.pending", { email: access.pendingEmail.emailMasked })}
        </StatusBanner>
      )}

      <SettingsCard>
        <MaskedValue
          icon={Mail}
          label={t("settings.access.email")}
          masked={access.emailMasked}
          revealed={shown?.field === "email" ? shown.value : null}
          countdown={clock(left)}
          note={access.emailVerified ? t("settings.access.emailNote") : t("settings.access.emailUnverified")}
          showLabel={t("settings.access.show")}
          hideLabel={t("settings.access.hide")}
          showing={revealing === "email"}
          onShow={() => (reauthValid ? void reveal("email") : ask({ kind: "reveal", field: "email" }))}
          onHide={() => setRevealed(null)}
          extraActions={
            <Button size="compact" onClick={() => (reauthValid ? setEmailOpen(true) : ask({ kind: "changeEmail" }))}>
              {t("settings.access.change")}
            </Button>
          }
        />
        {access.phoneMasked ? (
          <MaskedValue
            icon={Phone}
            label={t("settings.access.phone")}
            masked={access.phoneMasked}
            revealed={shown?.field === "phone" ? shown.value : null}
            countdown={clock(left)}
            note={t("settings.access.phoneNote")}
            showLabel={t("settings.access.show")}
            hideLabel={t("settings.access.hide")}
            showing={revealing === "phone"}
            onShow={() => (reauthValid ? void reveal("phone") : ask({ kind: "reveal", field: "phone" }))}
            onHide={() => setRevealed(null)}
          />
        ) : (
          <SettingRow icon={Phone} label={t("settings.access.phone")} value={t("settings.access.phoneNone")} note={t("settings.access.phoneNote")} />
        )}
        {access.password.set ? (
          <SettingRow
            icon={KeyRound}
            label={t("settings.access.password")}
            value={PASSWORD_DOTS}
            note={access.password.changedAt ? t("settings.access.passwordNote", { date: formatDate(new Date(access.password.changedAt), locale, { dateStyle: "long" }) }) : t("settings.access.passwordNoteNew")}
            actions={
              <Button size="compact" onClick={() => setPasswordOpen(true)}>
                {t("settings.access.changePassword")}
              </Button>
            }
          />
        ) : (
          <div>
            <SettingRow
              icon={KeyRound}
              label={t("settings.access.password")}
              value={t("settings.access.passwordNone")}
              {...(viaProvider ? { note: t("settings.access.passwordNoneNote", { provider: t(`settings.access.provider.${viaProvider}`) }) } : {})}
              actions={
                <Button size="compact" loading={createLink.isPending} onClick={() => createLink.mutate({}, { onError: (error) => setProblem(errorMessage(t, error)) })}>
                  {t("settings.access.createPassword")}
                </Button>
              }
            />
            {createLink.data && (
              <div className="px-5 pb-4">
                <EmailSentBlock
                  title={t("settings.access.createSentTitle")}
                  text={t("settings.access.createSentText")}
                  emailMasked={createLink.data.data.emailMasked}
                  spamHint={t("auth.sent.spam")}
                  resend={null}
                  back={null}
                />
              </div>
            )}
          </div>
        )}
        {admin && access.twoFactor && <SettingRow icon={ShieldCheck} label={t("settings.access.twoFactor")} value={t("settings.access.twoFactorValue")} note={t("settings.access.twoFactorNote")} />}
      </SettingsCard>
      <p className="text-caption text-text-muted">{t("settings.access.revealNote")}</p>

      <SettingsCard title={t("settings.access.linked")}>
        {PROVIDERS.map((provider) => {
          const isLinked = linked.includes(provider);
          const only = onlyMethod(provider);
          return (
            <SettingRow
              key={provider}
              icon={Link2}
              label={t(`settings.access.provider.${provider}`)}
              value={isLinked ? t("settings.access.linkedYes") : t("settings.access.linkedNo")}
              {...(only ? { note: t("settings.access.onlyMethod") } : {})}
              actions={
                isLinked ? (
                  <Button variant="secondary" size="compact" disabled={only} onClick={() => setUnlink(provider)}>
                    {t("settings.access.removeLink")}
                  </Button>
                ) : (
                  <Button
                    size="compact"
                    loading={link.isPending && link.variables?.params.provider === PROVIDER_PATH[provider]}
                    // Phase 1: the mock answers without a provider window; Phase 2 sends the provider's credential.
                    onClick={() => link.mutate({ params: { provider: PROVIDER_PATH[provider] }, body: { credential: PROVIDER_PATH[provider] } }, { onSuccess: ({ data }) => (setAccess(data), markSaved()) })}
                  >
                    {t(`settings.access.connect.${provider}`)}
                  </Button>
                )
              }
            />
          );
        })}
      </SettingsCard>

      <ReauthDialog t={t} open={reauthOpen} access={access} onClose={() => (setReauthOpen(false), setAfterReauth(null))} onDone={afterReauthDone} />
      <EmailDialog t={t} open={emailOpen} onClose={() => setEmailOpen(false)} onNeedsReauth={() => (setEmailOpen(false), ask({ kind: "changeEmail" }))} />
      <PasswordDialog
        t={t}
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onChanged={() => {
          setPasswordOpen(false);
          setNotice(t("settings.access.passwordChanged"));
          markSaved();
        }}
      />
      <UnlinkDialog t={t} provider={unlink} onClose={() => setUnlink(null)} onDone={(next) => (setUnlink(null), setAccess(next), markSaved())} />
    </div>
  );
}

/** "Önce sen olduğunu doğrula": the password, or the linked provider (design States 1, Forms 8). */
export function ReauthDialog({ t, open, access, onClose, onDone }: { t: Translator; open: boolean; access: AccountAccess; onClose: () => void; onDone: () => void }) {
  const queryClient = useQueryClient();
  const reauth = useApiMutation("reauth");
  const [password, setPassword] = useState("");
  const providers = access.identities.filter((row) => row.linked).map((row) => row.provider);
  const done = () => {
    setPassword("");
    void queryClient.invalidateQueries({ queryKey: apiQueryKey("getAccess", {}) });
    onDone();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!password || reauth.isPending) return;
    reauth.mutate({ body: { method: "PASSWORD", password } }, { onSuccess: done, onError: () => setPassword("") });
  };
  return (
    <Dialog open={open} onClose={onClose} title={t("settings.reauth.title")} closeLabel={t("common.close")} size="compact">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-body-sm text-text-muted">{access.password.set ? t("settings.reauth.text", { count: access.reauthMinutes }) : t("settings.reauth.textProvider", { count: access.reauthMinutes })}</p>
        {reauth.isError && <StatusBanner tone="danger">{errorMessage(t, reauth.error)}</StatusBanner>}
        {access.password.set && (
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <TextField
              label={t("auth.password")}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showPasswordLabel={t("common.showPassword")}
              hidePasswordLabel={t("common.hidePassword")}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                {t("settings.cancel")}
              </Button>
              <Button type="submit" loading={reauth.isPending && reauth.variables?.body.method === "PASSWORD"} disabled={!password}>
                {t("settings.reauth.submit")}
              </Button>
            </div>
          </form>
        )}
        {providers.map((provider) => (
          <ProviderButton
            key={provider}
            label={t(`settings.reauth.withProvider.${provider}`)}
            mark={<ProviderMark letter={t(`settings.access.provider.${provider}`).charAt(0)} />}
            loading={reauth.isPending && reauth.variables?.body.method === provider}
            // Phase 1: the mock answers without a provider window.
            onClick={() => reauth.mutate({ body: { method: provider, credential: PROVIDER_PATH[provider] } }, { onSuccess: done })}
          />
        ))}
        {!access.password.set && (
          <Button variant="secondary" onClick={onClose}>
            {t("settings.cancel")}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/** "E-postanı değiştir" → the sent state in the same dialog (design Forms 2). */
function EmailDialog({ t, open, onClose, onNeedsReauth }: { t: Translator; open: boolean; onClose: () => void; onNeedsReauth: () => void }) {
  const setAccess = useSetAccess();
  const markSaved = useMarkSaved();
  const change = useApiMutation("changeEmail");
  const resend = useApiMutation("resendEmailChange");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState<AccountAccess | null>(null);
  const pending = sent?.pendingEmail ?? null;
  const left = useSecondsLeft(pending ? new Date(pending.sentAt).getTime() + pending.resendAfterSeconds * SECOND_MS : null);
  const valid = isEmail(email);
  const close = () => {
    setEmail("");
    setSubmitted(false);
    setSent(null);
    change.reset();
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || change.isPending) return;
    change.mutate(
      { body: { email } },
      {
        onSuccess: ({ data }) => {
          setSent(data);
          setAccess(data);
          markSaved();
        },
        onError: (error) => {
          if (error.body.code === "REAUTH_REQUIRED") onNeedsReauth();
        },
      },
    );
  };
  return (
    <Dialog open={open} onClose={close} title={t("settings.emailDialog.title")} closeLabel={t("common.close")} size="compact">
      <div className="flex flex-col gap-4 p-5">
        {pending ? (
          <EmailSentBlock
            title={t("settings.emailDialog.sentTitle")}
            text={t("settings.emailDialog.sentText")}
            emailMasked={pending.emailMasked}
            spamHint={t("settings.emailDialog.sentNote")}
            resend={
              <Button variant="secondary" disabled={left > 0} loading={resend.isPending} onClick={() => resend.mutate({}, { onSuccess: ({ data }) => (setSent(data), setAccess(data)) })}>
                {left > 0 ? t("settings.access.resendIn", { time: clock(left) }) : t("settings.access.resend")}
              </Button>
            }
            back={null}
          />
        ) : (
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            {change.isError && change.error.body.code !== "REAUTH_REQUIRED" && <StatusBanner tone="danger">{errorMessage(t, change.error)}</StatusBanner>}
            <TextField
              label={t("settings.emailDialog.field")}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              {...(submitted && !valid ? { error: t("auth.fieldError.email") } : {})}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {t("settings.cancel")}
              </Button>
              <Button type="submit" loading={change.isPending}>
                {t("settings.emailDialog.submit")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}

/** "Şifreni değiştir": current + new password with the live rules (design Forms 1). */
function PasswordDialog({ t, open, onClose, onChanged }: { t: Translator; open: boolean; onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const policy = useAuthPolicy();
  const change = useApiMutation("changePassword");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const rules = ruleList(t, next, policy?.passwordMinLength ?? 0);
  const ready = current.length > 0 && rules.every((rule) => rule.met) && policy !== null;
  const close = () => {
    setCurrent("");
    setNext("");
    change.reset();
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || change.isPending) return;
    change.mutate(
      { body: { currentPassword: current, newPassword: next } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: apiQueryKey("getSecurity", {}) });
          void queryClient.invalidateQueries({ queryKey: apiQueryKey("getAccess", {}) });
          setCurrent("");
          setNext("");
          onChanged();
        },
        onError: () => setCurrent(""),
      },
    );
  };
  return (
    <Dialog open={open} onClose={close} title={t("settings.passwordDialog.title")} closeLabel={t("common.close")} size="compact">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-5">
        {change.isError && <StatusBanner tone="danger">{errorMessage(t, change.error as ApiError)}</StatusBanner>}
        <TextField
          label={t("settings.passwordDialog.current")}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          showPasswordLabel={t("common.showPassword")}
          hidePasswordLabel={t("common.hidePassword")}
        />
        <div className="flex flex-col gap-2">
          <TextField
            label={t("settings.passwordDialog.next")}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            showPasswordLabel={t("common.showPassword")}
            hidePasswordLabel={t("common.hidePassword")}
          />
          <PasswordRules label={t("auth.rules.label")} rules={rules} metLabel={t("auth.rules.met")} unmetLabel={t("auth.rules.unmet")} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            {t("settings.cancel")}
          </Button>
          <Button type="submit" loading={change.isPending} disabled={!ready}>
            {t("settings.passwordDialog.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** "Google bağlantısı kaldırılsın mı?" (design Forms 6). */
function UnlinkDialog({ t, provider, onClose, onDone }: { t: Translator; provider: Provider | null; onClose: () => void; onDone: (access: AccountAccess) => void }) {
  const unlink = useApiMutation("unlinkIdentity");
  return (
    <Dialog open={provider !== null} onClose={onClose} title={provider ? t(`settings.unlinkDialog.title.${provider}`) : ""} closeLabel={t("common.close")} size="compact">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-body-sm text-text-muted">{t("settings.unlinkDialog.text")}</p>
        {unlink.isError && <StatusBanner tone="danger">{errorMessage(t, unlink.error)}</StatusBanner>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("settings.cancel")}
          </Button>
          <Button
            variant="danger"
            loading={unlink.isPending}
            onClick={() => provider && unlink.mutate({ params: { provider: PROVIDER_PATH[provider] } }, { onSuccess: ({ data }) => onDone(data) })}
          >
            {t("settings.unlinkDialog.confirm")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
