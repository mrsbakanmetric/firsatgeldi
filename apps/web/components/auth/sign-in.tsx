"use client";

// Sign-in and Sign-up — `/[locale]/giris` (design "8 Giriş" v2.1: Main + States;
// pagedesign.md §8.8; modules.md Sign-in and Sign-up). Flow template in AuthShell:
// hero | guest product card + form card; the columns end together; on phones the
// form comes first and the hero after it. Tabs Giriş yap / Kayıt ol, Google and Apple
// on top, then e-mail + password. Account states appear only after a correct password
// (architecture.md §17 [DECIDED 2026-11-18]); a wrong e-mail or password is one generic
// answer with the fixed Google/Apple note. Returns to `?next=` (same site only).
import type { ApiError, SignInResult } from "@firsatgeldi/contracts";
import { formatDate } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, Checkbox, EmailSentBlock, GuestProductCard, PageTemplate, PasswordRules, ProviderButton, SegmentedChoice, StatusBanner, TextField } from "@firsatgeldi/ui";
import { Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { useApiMutation, useSession } from "../../lib/api/hooks";
import { clock, useSecondsLeft } from "../../lib/auth/countdown";
import { useLocationSearch } from "../../lib/auth/location";
import { NEXT_PARAM, rememberNext, safeNext, SIGN_UP_PARAM } from "../../lib/auth/next";
import { hrefFor } from "../../lib/shell/navigation";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { readDraft, RESUME_PARAM } from "../search-add/draft";
import { useTranslator } from "../shell/parts";
import { AccountState, type AccountView } from "./account-states";
import { AuthHero } from "./hero";
import { FormCard, isEmail, ProviderMark, ruleList, softDisabled, useAuthPolicy, useFinishSignIn } from "./shared";

const SECOND_MS = 1000;
const SECONDS_PER_MINUTE = 60;

type Tab = "signin" | "signup";

/** What the form card shows. */
type View =
  | { kind: "form" }
  | { kind: "forgot" }
  | { kind: "sent"; purpose: "verify" | "reset"; email: string; emailMasked: string; resendAt: number; resent: boolean }
  | AccountView;

/** A problem drawn above the form (States 1, 2, 7) or the result of "Vazgeç, silinsin". */
type Problem = { kind: "wrong"; remaining: number } | { kind: "locked"; until: number; minutes: number } | { kind: "unavailable" } | { kind: "rateLimited" } | { kind: "kept"; purgeAfter: string } | null;

function paramsOf(error: ApiError): Record<string, string | number> {
  return "params" in error.body && error.body.params ? error.body.params : {};
}

export interface SignInContext {
  readonly next: string;
  /** The guest's marked product, when sign-in was asked at the confirm step. */
  readonly guest: { name: string; variant: string | null; imageSha256: string | null } | null;
  readonly tab: Tab;
}

function readContext(locale: Locale, search: string): SignInContext {
  const params = new URLSearchParams(search);
  const next = safeNext(params.get(NEXT_PARAM), locale);
  const resumes = new URLSearchParams(next.split("?")[1] ?? "").has(RESUME_PARAM);
  const draft = resumes ? readDraft() : null;
  return {
    next,
    guest: draft ? { name: draft.candidate.product.name, variant: draft.candidate.variantLine ?? null, imageSha256: draft.candidate.product.imageSha256 } : null,
    tab: params.get(SIGN_UP_PARAM.name) === SIGN_UP_PARAM.value ? "signup" : "signin",
  };
}

export function SignIn({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const router = useRouter();
  const session = useSession();
  const search = useLocationSearch();
  const context = useMemo(() => (search === null ? null : readContext(locale, search)), [locale, search]);

  // Already signed in: straight back to where the user was going.
  useEffect(() => {
    if (context && session.status === "ready" && session.me) router.replace(context.next);
  }, [context, session, router]);

  return (
    <PageTemplate
      kind="flow"
      title={t("auth.hero.title")}
      titleInContent
      endTogether
      sideFirstOnPhone
      side={
        <>
          {context?.guest && <GuestProductCard title={t("auth.guestCard")} name={context.guest.name} variant={context.guest.variant} imageSrc={imageUrl(context.guest.imageSha256)} fallbackIcon={Package} />}
          {context && <AuthPanel locale={locale} t={t} context={context} />}
        </>
      }
      sideLabel={t("auth.formLabel")}
    >
      <AuthHero t={t} />
    </PageTemplate>
  );
}

function AuthPanel({ locale, t, context }: { locale: Locale; t: Translator; context: SignInContext }) {
  const policy = useAuthPolicy();
  const finish = useFinishSignIn();
  const [tab, setTab] = useState<Tab>(context.tab);
  const [view, setView] = useState<View>({ kind: "form" });
  const [problem, setProblem] = useState<Problem>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const signIn = useApiMutation("signIn");
  const signUp = useApiMutation("signUp");
  const google = useApiMutation("signInWithGoogle");
  const apple = useApiMutation("signInWithApple");
  const forgot = useApiMutation("forgotPassword");
  const busy = signIn.isPending || signUp.isPending || google.isPending || apple.isPending;

  const minLength = policy?.passwordMinLength ?? 0;
  const rules = ruleList(t, password, minLength);
  const emailOk = isEmail(email);
  const rulesOk = rules.every((rule) => rule.met);

  const resetForm = (next: Partial<{ email: string }> = {}) => {
    setPassword("");
    setAgree(false);
    setTouched({ email: false, password: false });
    setSubmitted(false);
    if (next.email !== undefined) setEmail(next.email);
  };

  const onResult = (result: SignInResult) => {
    setProblem(null);
    if (result.status === "SIGNED_IN") return finish(result.me, context.next);
    rememberNext(context.next);
    setView(result.status === "VERIFY_EMAIL" ? { kind: "unverified", email, emailMasked: result.emailMasked } : result.status === "PENDING_DELETION" ? { kind: "pendingDeletion", challenge: result.challenge, requestedAt: result.requestedAt, purgeAfter: result.purgeAfter } : { kind: "suspended", challenge: result.challenge, reasonKey: result.reasonKey });
  };

  const onSignInError = (error: ApiError) => {
    setPassword("");
    if (error.body.code === "INVALID_CREDENTIALS") return setProblem({ kind: "wrong", remaining: Number(paramsOf(error)["remainingAttempts"] ?? 0) });
    if (error.body.code === "LOCKED") {
      const seconds = Number(paramsOf(error)["retryAfterSeconds"] ?? 0);
      return setProblem({ kind: "locked", until: Date.now() + seconds * SECOND_MS, minutes: Math.ceil(seconds / SECONDS_PER_MINUTE) });
    }
    setProblem({ kind: "unavailable" });
  };

  const emailSent = (purpose: "verify" | "reset", sentTo: string, emailMasked: string, resendAfterSeconds: number) =>
    setView({ kind: "sent", purpose, email: sentTo, emailMasked, resendAt: Date.now() + resendAfterSeconds * SECOND_MS, resent: false });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (busy) return;
    if (tab === "signin") {
      if (!emailOk || password.length === 0) return;
      signIn.mutate({ body: { email, password } }, { onSuccess: ({ data }) => onResult(data), onError: onSignInError });
      return;
    }
    if (!emailOk || !rulesOk || !agree || !policy) return;
    signUp.mutate(
      { body: { email, password, acceptTerms: true, termsVersion: policy.termsVersion, locale } },
      {
        onSuccess: ({ data }) => {
          setProblem(null);
          rememberNext(context.next);
          emailSent("verify", email, data.emailMasked, data.resendAfterSeconds);
        },
        onError: () => setProblem({ kind: "unavailable" }),
      },
    );
  };

  const provider = (which: "google" | "apple") => {
    // Phase 1: the mock answers without a provider window; Phase 2 sends the provider's credential.
    const mutation = which === "google" ? google : apple;
    mutation.mutate({ body: { credential: which } }, { onSuccess: ({ data }) => onResult(data), onError: () => setProblem({ kind: "unavailable" }) });
  };

  const sendForgot = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!emailOk || forgot.isPending) return;
    forgot.mutate(
      { body: { email } },
      {
        onSuccess: ({ data }) => emailSent("reset", email, data.emailMasked, data.resendAfterSeconds),
        onError: (error) => setProblem({ kind: error.body.code === "RATE_LIMITED" ? "rateLimited" : "unavailable" }),
      },
    );
  };

  if (view.kind === "sent") {
    return <SentCard t={t} view={view} onBack={() => (resetForm(), setView({ kind: "form" }))} onResent={(next) => setView(next)} />;
  }

  if (view.kind === "forgot") {
    return (
      <FormCard className="flex-1">
        <Button variant="link" className="self-start" onClick={() => (setSubmitted(false), setView({ kind: "form" }))}>
          {t("auth.forgot.back")}
        </Button>
        <h2 className="text-h2 text-text">{t("auth.forgot.title")}</h2>
        <p className="text-body-sm text-text-muted">{t("auth.forgot.text")}</p>
        {problem?.kind === "unavailable" && <Unavailable t={t} />}
        {problem?.kind === "rateLimited" && <StatusBanner tone="warning">{t("errors.rateLimited")}</StatusBanner>}
        <form noValidate onSubmit={sendForgot} className="flex flex-col gap-4">
          <EmailField t={t} value={email} onChange={setEmail} showError={(touched.email || submitted) && !emailOk} onBlur={() => setTouched((value) => ({ ...value, email: true }))} />
          <Button type="submit" loading={forgot.isPending} className="w-full">
            {t("auth.forgot.cta")}
          </Button>
        </form>
      </FormCard>
    );
  }

  if (view.kind !== "form") {
    return (
      <FormCard className="flex-1">
        <AccountState
          locale={locale}
          t={t}
          view={view}
          onSignedIn={(me) => finish(me, context.next)}
          onVerifySent={(sentTo, masked, wait) => emailSent("verify", sentTo, masked, wait)}
          onBack={(kept) => {
            resetForm(view.kind === "unverified" ? { email: "" } : {});
            setProblem(kept ? { kind: "kept", purgeAfter: kept } : null);
            setView({ kind: "form" });
          }}
        />
      </FormCard>
    );
  }

  const locked = problem?.kind === "locked";
  const signInMissing = !emailOk ? t("auth.fieldError.email") : password.length === 0 ? t("auth.fieldError.password") : null;
  const signUpMissing = !emailOk ? t("auth.fieldError.email") : (rules.find((rule) => !rule.met)?.text ?? (!agree ? t("auth.missing.terms") : null));
  const missing = tab === "signin" ? signInMissing : signUpMissing;
  const passwordProblem = passwordError(t, tab, password, rulesOk, touched.password, submitted);

  return (
    <FormCard className="flex-1">
      <SegmentedChoice
        label={t("auth.tabs.label")}
        options={[
          { value: "signin", label: t("auth.tabs.signIn") },
          { value: "signup", label: t("auth.tabs.signUp") },
        ]}
        value={tab}
        onValueChange={(value) => {
          setTab(value as Tab);
          setProblem(null);
          setSubmitted(false);
          setPassword("");
        }}
      />
      <ProblemBanner t={t} problem={problem} onRetryLocked={() => setProblem(null)} onReset={() => (setSubmitted(false), setView({ kind: "forgot" }))} />
      <div className="flex flex-col gap-2">
        <ProviderButton label={t("auth.google")} mark={<ProviderMark letter="G" />} onClick={() => provider("google")} loading={google.isPending} disabled={busy || locked} />
        <ProviderButton label={t("auth.apple")} mark={<ProviderMark letter="A" />} onClick={() => provider("apple")} loading={apple.isPending} disabled={busy || locked} />
      </div>
      <Divider text={t("auth.divider")} />
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <fieldset disabled={busy || locked} className="flex min-w-0 flex-col gap-4">
          <EmailField t={t} value={email} onChange={setEmail} showError={(touched.email || submitted) && !emailOk} onBlur={() => setTouched((value) => ({ ...value, email: true }))} />
          <div className="flex flex-col gap-2">
            <TextField
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((value) => ({ ...value, password: true }))}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              {...(tab === "signin"
                ? {
                    labelAction: (
                      <Button variant="link" className="text-body-sm" onClick={() => (setSubmitted(false), setView({ kind: "forgot" }))}>
                        {t("auth.forgotLink")}
                      </Button>
                    ),
                  }
                : {})}
              showPasswordLabel={t("common.showPassword")}
              hidePasswordLabel={t("common.hidePassword")}
              {...(passwordProblem ? { error: passwordProblem } : {})}
            />
            {tab === "signup" && <PasswordRules label={t("auth.rules.label")} rules={rules} metLabel={t("auth.rules.met")} unmetLabel={t("auth.rules.unmet")} />}
          </div>
          {tab === "signup" && (
            <div className="flex flex-col gap-1">
              <Checkbox label={<TermsSentence locale={locale} t={t} />} checked={agree} onCheckedChange={setAgree} />
              {submitted && !agree && <p className="text-caption text-danger">{t("auth.fieldError.terms")}</p>}
            </div>
          )}
        </fieldset>
        <SubmitRow
          label={tab === "signin" ? (problem?.kind === "unavailable" ? t("auth.unavailable.retry") : t("auth.signInCta")) : t("auth.signUpCta")}
          loading={signIn.isPending || signUp.isPending}
          missing={locked ? null : missing}
          locked={locked}
          hint={tab === "signin" ? t("auth.signInHint") : policy ? t("auth.signUpHint", { count: policy.welcomeGiftTokens }) : null}
        />
      </form>
    </FormCard>
  );
}

function passwordError(t: Translator, tab: Tab, password: string, rulesOk: boolean, touched: boolean, submitted: boolean): string | null {
  if (!(touched || submitted)) return null;
  if (tab === "signin") return submitted && password.length === 0 ? t("auth.fieldError.password") : null;
  return rulesOk ? null : t("auth.fieldError.rules");
}

function EmailField({ t, value, onChange, showError, onBlur }: { t: Translator; value: string; onChange: (value: string) => void; showError: boolean; onBlur: () => void }) {
  return (
    <TextField
      label={t("auth.email")}
      type="email"
      autoComplete="email"
      inputMode="email"
      placeholder={t("auth.emailPlaceholder")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      {...(showError ? { error: t("auth.fieldError.email") } : {})}
    />
  );
}

function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-caption text-text-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-divider" />
      <span>{text}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-divider" />
    </div>
  );
}

/** "Kullanım koşullarını okudum ve kabul ediyorum. Kişisel verilerin KVKK aydınlatma metnindeki gibi işlenir." with both links. */
function TermsSentence({ locale, t }: { locale: Locale; t: Translator }) {
  const TERMS = "\u0001";
  const KVKK = "\u0002";
  const parts = t("auth.terms.sentence", { terms: TERMS, kvkk: KVKK }).split(/(\u0001|\u0002)/);
  const link = (href: string, text: string) => (
    <Link key={href} href={href} className="font-semibold text-primary underline underline-offset-4">
      {text}
    </Link>
  );
  return (
    <span>
      {parts.map((part, index) => (part === TERMS ? link(hrefFor("/kosullar", locale), t("auth.terms.termsLink")) : part === KVKK ? link(hrefFor("/kvkk", locale), t("auth.terms.kvkkLink")) : <span key={index}>{part}</span>))}
    </span>
  );
}

function SubmitRow({ label, loading, missing, locked, hint }: { label: string; loading: boolean; missing: string | null; locked: boolean; hint: string | null }) {
  const reasonId = useId();
  if (locked) return null;
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" loading={loading} {...softDisabled(missing !== null, reasonId)}>
        {label}
      </Button>
      {missing && (
        <span id={reasonId} className="text-center text-caption font-medium text-text-muted">
          {missing}
        </span>
      )}
      {hint && <span className="text-center text-caption text-text-muted">{hint}</span>}
    </div>
  );
}

function Unavailable({ t }: { t: Translator }) {
  return (
    <StatusBanner tone="danger" title={t("auth.unavailable.title")}>
      {t("auth.unavailable.body")}
    </StatusBanner>
  );
}

function ProblemBanner({ t, problem, onRetryLocked, onReset }: { t: Translator; problem: Problem; onRetryLocked: () => void; onReset: () => void }) {
  if (!problem) return null;
  if (problem.kind === "unavailable") return <Unavailable t={t} />;
  if (problem.kind === "rateLimited") return <StatusBanner tone="warning">{t("errors.rateLimited")}</StatusBanner>;
  if (problem.kind === "kept") return <KeptNotice t={t} purgeAfter={problem.purgeAfter} />;
  if (problem.kind === "wrong") {
    return (
      <StatusBanner tone="danger" title={t("auth.wrong.title")}>
        <span className="flex flex-col gap-1">
          <span>{t("auth.wrong.body", { count: problem.remaining })}</span>
          <span>{t("auth.wrong.providerNote")}</span>
        </span>
      </StatusBanner>
    );
  }
  return <LockedBanner t={t} until={problem.until} minutes={problem.minutes} onRetry={onRetryLocked} onReset={onReset} />;
}

function LockedBanner({ t, until, minutes, onRetry, onReset }: { t: Translator; until: number; minutes: number; onRetry: () => void; onReset: () => void }) {
  const left = useSecondsLeft(until);
  return (
    <div className="flex flex-col gap-3">
      <StatusBanner tone="warning" title={t("auth.locked.title", { count: minutes })}>
        {t("auth.locked.body", { time: clock(left) })}
      </StatusBanner>
      <Button onClick={onRetry} disabled={left > 0} className="w-full">
        {left > 0 ? t("auth.locked.retryIn", { time: clock(left) }) : t("auth.locked.retry")}
      </Button>
      <Button variant="link" className="self-center" onClick={onReset}>
        {t("auth.locked.reset")}
      </Button>
    </div>
  );
}

function KeptNotice({ t, purgeAfter }: { t: Translator; purgeAfter: string }) {
  const date = formatDate(new Date(purgeAfter), t.locale, { dateStyle: "long" });
  return <StatusBanner tone="info">{t("auth.pendingDeletion.kept", { date })}</StatusBanner>;
}

/** "E-postanı doğrula" / "Bağlantıyı gönderdik" with "Tekrar gönder · 0:58" and "Girişe dön". */
function SentCard({ t, view, onBack, onResent }: { t: Translator; view: Extract<View, { kind: "sent" }>; onBack: () => void; onResent: (view: Extract<View, { kind: "sent" }>) => void }) {
  const left = useSecondsLeft(view.resendAt);
  const resendVerify = useApiMutation("resendVerification");
  const resendReset = useApiMutation("forgotPassword");
  const mutation = view.purpose === "verify" ? resendVerify : resendReset;
  const again = () =>
    mutation.mutate({ body: { email: view.email } }, { onSuccess: ({ data }) => onResent({ ...view, emailMasked: data.emailMasked, resendAt: Date.now() + data.resendAfterSeconds * SECOND_MS, resent: true }) });
  const resendButton: ReactNode = (
    <Button variant="secondary" onClick={again} loading={mutation.isPending} disabled={left > 0}>
      {left > 0 ? t("auth.sent.resendIn", { time: clock(left) }) : t("auth.sent.resend")}
    </Button>
  );
  return (
    <FormCard className="flex-1 justify-center">
      <EmailSentBlock
        title={view.purpose === "verify" ? t("auth.sent.verifyTitle") : t("auth.sent.resetTitle")}
        text={view.purpose === "verify" ? t("auth.sent.verifyText") : t("auth.sent.resetText")}
        emailMasked={view.emailMasked}
        spamHint={t("auth.sent.spam")}
        resend={resendButton}
        back={
          <Button variant="ghost" onClick={onBack}>
            {t("auth.sent.back")}
          </Button>
        }
        notice={view.resent ? <span className="text-caption font-semibold text-savings">{t("auth.sent.resent")}</span> : undefined}
      />
    </FormCard>
  );
}
