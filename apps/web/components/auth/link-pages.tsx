"use client";

// Pages opened from an e-mail link (design "8 Giriş" v2.1, board Links; pagedesign.md §8.8):
// new password (`/sifre-sifirla?token=`) · e-mail verified (`/dogrula?token=`; skeleton
// while verifying) · expired or used link (one page for both, with "Yeni bağlantı gönder").
import type { ApiError } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, EmailSentBlock, PasswordRules, SkeletonBlock, StatusBanner, TextField } from "@firsatgeldi/ui";
import { Check, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { clock, useSecondsLeft } from "../../lib/auth/countdown";
import { useLocationSearch } from "../../lib/auth/location";
import { takeRememberedNext } from "../../lib/auth/next";
import { hrefFor } from "../../lib/shell/navigation";
import { useTranslator } from "../shell/parts";
import { FormCard, isEmail, LinkPageFrame, ruleList, softDisabled, useAuthPolicy, useFinishSignIn } from "./shared";

const SECOND_MS = 1000;
const TOKEN_PARAM = "token";

/** The link's token from the address bar (read after mount: the page is static). */
function useToken(): string | null | undefined {
  const search = useLocationSearch();
  return search === null ? undefined : new URLSearchParams(search).get(TOKEN_PARAM);
}

function Unavailable({ t }: { t: Translator }) {
  return (
    <StatusBanner tone="danger" title={t("auth.unavailable.title")}>
      {t("auth.unavailable.body")}
    </StatusBanner>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <FormCard>
      <span role="status" className="sr-only">
        {label}
      </span>
      <SkeletonBlock shape="title" width="2/3" />
      <SkeletonBlock width="1/2" />
      <SkeletonBlock shape="card" />
    </FormCard>
  );
}

// ── New password ─────────────────────────────────────────────────────────────

export function NewPasswordPage({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const token = useToken();
  const context = useApiQuery("getPasswordReset", { query: { token: token ?? "" } }, { enabled: Boolean(token), retry: false });
  if (token === undefined || (token && context.isPending)) {
    return (
      <LinkPageFrame>
        <Loading label={t("auth.newPassword.checking")} />
      </LinkPageFrame>
    );
  }
  if (!token || (context.isError && context.error.body.code === "LINK_INVALID")) {
    return (
      <LinkPageFrame>
        <LinkInvalidCard locale={locale} t={t} purpose="reset" />
      </LinkPageFrame>
    );
  }
  return <LinkPageFrame>{context.isError ? <Unavailable t={t} /> : context.data && <NewPasswordForm locale={locale} t={t} token={token} emailMasked={context.data.data.emailMasked} />}</LinkPageFrame>;
}

function NewPasswordForm({ locale, t, token, emailMasked }: { locale: Locale; t: Translator; token: string; emailMasked: string }) {
  const policy = useAuthPolicy();
  const save = useApiMutation("resetPassword");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const reasonId = useId();
  const rules = ruleList(t, password, policy?.passwordMinLength ?? 0);
  const missing = rules.find((rule) => !rule.met)?.text ?? null;

  if (expired) return <LinkInvalidCard locale={locale} t={t} purpose="reset" />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (missing || !policy || save.isPending) return;
    save.mutate({ body: { token, password } }, { onError: (error: ApiError) => error.body.code === "LINK_INVALID" && setExpired(true) });
  };

  return (
    <FormCard>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text">{t("auth.newPassword.title")}</h1>
        <span className="text-body-sm text-text-muted">{emailMasked}</span>
      </div>
      {save.isSuccess ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg bg-primary-subtle p-4">
          <span className="text-body-sm font-semibold text-on-primary-subtle">{t("auth.newPassword.done")}</span>
          <Link href={hrefFor("/giris", locale)} className={buttonClasses("primary", "w-full")}>
            {t("auth.newPassword.signIn")}
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {save.isError && !expired && <Unavailable t={t} />}
          <div className="flex flex-col gap-2">
            <TextField
              label={t("auth.newPassword.field")}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showPasswordLabel={t("common.showPassword")}
              hidePasswordLabel={t("common.hidePassword")}
              {...(submitted && missing ? { error: t("auth.fieldError.rules") } : {})}
            />
            <PasswordRules label={t("auth.rules.label")} rules={rules} metLabel={t("auth.rules.met")} unmetLabel={t("auth.rules.unmet")} />
          </div>
          <Button type="submit" loading={save.isPending} {...softDisabled(missing !== null, reasonId)}>
            {t("auth.newPassword.cta")}
          </Button>
          {missing && (
            <span id={reasonId} className="text-center text-caption font-medium text-text-muted">
              {missing}
            </span>
          )}
        </form>
      )}
    </FormCard>
  );
}

// ── E-mail verified ──────────────────────────────────────────────────────────

export function VerifyEmailPage({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const router = useRouter();
  const token = useToken();
  const finish = useFinishSignIn();
  const verify = useApiMutation("verifyEmail");
  const [gift, setGift] = useState<number | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verify.mutate(
      { body: { token } },
      {
        onSuccess: ({ data }) => {
          // Only an active account signs in here; any other state is shown by the sign-in page.
          if (data.status !== "SIGNED_IN") return router.replace(hrefFor("/giris", locale));
          finish(data.me, null);
          setGift(data.welcomeGift);
          setNext(takeRememberedNext(locale));
        },
      },
    );
  }, [token, verify, finish, router, locale]);

  if (token === null || (verify.isError && verify.error.body.code === "LINK_INVALID")) {
    return (
      <LinkPageFrame>
        <LinkInvalidCard locale={locale} t={t} purpose="verify" />
      </LinkPageFrame>
    );
  }
  if (verify.isError) {
    return (
      <LinkPageFrame>
        <Unavailable t={t} />
      </LinkPageFrame>
    );
  }
  if (!verify.isSuccess || next === null) {
    return (
      <LinkPageFrame>
        <Loading label={t("auth.verified.verifying")} />
      </LinkPageFrame>
    );
  }
  return (
    <LinkPageFrame>
      <FormCard className="items-center text-center">
        <span className="flex size-(--size-thumb-sm) items-center justify-center rounded-pill bg-primary-subtle text-on-primary-subtle">
          <Check aria-hidden="true" className="size-(--size-icon-lg)" />
        </span>
        <h1 className="text-h2 text-text">{t("auth.verified.title")}</h1>
        {gift !== null && <span className="text-body-sm font-semibold text-savings">{t("auth.verified.gift", { count: gift })}</span>}
        <Link href={next} className={buttonClasses("primary", "w-full")}>
          {t("auth.verified.continue")}
        </Link>
      </FormCard>
    </LinkPageFrame>
  );
}

// ── Expired or used link ─────────────────────────────────────────────────────

export function LinkInvalidCard({ locale, t, purpose }: { locale: Locale; t: Translator; purpose: "verify" | "reset" }) {
  const resendVerify = useApiMutation("resendVerification");
  const resendReset = useApiMutation("forgotPassword");
  const mutation = purpose === "verify" ? resendVerify : resendReset;
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState<{ emailMasked: string; resendAt: number } | null>(null);
  const left = useSecondsLeft(sent?.resendAt ?? null);
  const emailOk = isEmail(email);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (!emailOk || mutation.isPending) return;
    mutation.mutate({ body: { email } }, { onSuccess: ({ data }) => setSent({ emailMasked: data.emailMasked, resendAt: Date.now() + data.resendAfterSeconds * SECOND_MS }) });
  };
  const back = (
    <Link href={hrefFor("/giris", locale)} className={buttonClasses("ghost")}>
      {t("auth.linkInvalid.back")}
    </Link>
  );

  if (sent) {
    return (
      <FormCard>
        <EmailSentBlock
          title={purpose === "verify" ? t("auth.sent.verifyTitle") : t("auth.sent.resetTitle")}
          text={purpose === "verify" ? t("auth.sent.verifyText") : t("auth.sent.resetText")}
          emailMasked={sent.emailMasked}
          spamHint={t("auth.sent.spam")}
          resend={
            <Button variant="secondary" onClick={() => send()} loading={mutation.isPending} disabled={left > 0}>
              {left > 0 ? t("auth.sent.resendIn", { time: clock(left) }) : t("auth.sent.resend")}
            </Button>
          }
          back={back}
        />
      </FormCard>
    );
  }

  return (
    <FormCard>
      <StatusBanner tone="warning" icon={Clock} title={t("auth.linkInvalid.title")}>
        {t("auth.linkInvalid.body")}
      </StatusBanner>
      {mutation.isError && <StatusBanner tone="danger">{errorMessage(t, mutation.error)}</StatusBanner>}
      <form noValidate onSubmit={send} className="flex flex-col gap-4">
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          {...(submitted && !emailOk ? { error: t("auth.fieldError.email") } : {})}
        />
        <Button type="submit" loading={mutation.isPending} className="w-full">
          {t("auth.linkInvalid.cta")}
        </Button>
      </form>
      <div className="flex justify-center">{back}</div>
    </FormCard>
  );
}
