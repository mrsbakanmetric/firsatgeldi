// Sign-in and Sign-up (modules.md Sign-in and Sign-up; architecture.md §16 AUTH, §17;
// pagedesign.md §8.8 design v2.1). Shapes, the new endpoints and the error codes are
// [ASSUMPTION — shape] until architecture.md §16.1 writes them out.
//
// No account enumeration [DECIDED 2026-11-18] (architecture.md §17): nothing tells whether an
// account exists, how it was created or its state before a correct password — every wrong
// e-mail/password is the same INVALID_CREDENTIALS (Google/Apple-only accounts included);
// sign-up with a registered e-mail and "Şifremi unuttum" answer exactly like a new address.
import { z } from "zod";
import { ApiLocale, Id, Timestamp } from "./common";
import { Me } from "./session";

/** An e-mail as typed: trimmed and lower-cased before it is checked. */
export const Email = z.string().trim().toLowerCase().pipe(z.email().max(254));
/** A password is never trimmed, never logged and never echoed back. */
export const Password = z.string().min(1).max(128);
/** One-time token from an e-mail link (`email_tokens`, stored hashed on the server). */
export const LinkToken = z.string().regex(/^[A-Za-z0-9_-]{16,}$/);
/** Short-lived handle after a correct password on a suspended or pending-deletion account. */
export const AccountChallenge = z.string().regex(/^[A-Za-z0-9_-]{16,}$/);

/**
 * `GET /auth/policy` — the numbers the sign-in screens show, from `system_settings`
 * (database.md §9), so the client never keeps its own copy (the upload `poll` pattern).
 */
export const AuthPolicy = z.object({
  /** `auth.password_min_length`: the live rule "En az N karakter". */
  passwordMinLength: z.number().int().positive(),
  /** `auth.resend_cooldown_seconds`: "Tekrar gönder" countdown. */
  resendCooldownSeconds: z.number().int().nonnegative(),
  /** `tokens.welcome_gift`: "Kayıt olunca N hediye jeton". */
  welcomeGiftTokens: z.number().int().nonnegative(),
  /** Version of the terms of use the sign-up checkbox accepts (`legal_document_versions`). */
  termsVersion: z.string().min(1),
});
export type AuthPolicy = z.infer<typeof AuthPolicy>;

/**
 * Result of every sign-in path (e-mail, Google, Apple, verified link, restore).
 * SIGNED_IN opens the session (httpOnly cookies, architecture.md §15.3) and carries `me`;
 * `welcomeGift` = tokens just granted ("3 hediye jeton hesabında"), else null.
 * The other three come only after a correct password and open no session for the app:
 * VERIFY_EMAIL ("Önce e-postanı doğrula") · PENDING_DELETION ("Hesabımı geri aç" /
 * "Vazgeç, silinsin") · SUSPENDED (reason, "Destek talebi aç", "Verilerimi indir").
 */
export const SignInResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("SIGNED_IN"), me: Me, welcomeGift: z.number().int().positive().nullable() }),
  z.object({ status: z.literal("VERIFY_EMAIL"), emailMasked: z.string().min(1) }),
  z.object({ status: z.literal("PENDING_DELETION"), challenge: AccountChallenge, requestedAt: Timestamp, purgeAfter: Timestamp }),
  /** `reasonKey` = catalogue key of the suspension reason (`users.suspended_reason` code), never free text. */
  z.object({ status: z.literal("SUSPENDED"), challenge: AccountChallenge, reasonKey: z.string().min(1) }),
]);
export type SignInResult = z.infer<typeof SignInResult>;

/** `POST /auth/login` — wrong → INVALID_CREDENTIALS { remainingAttempts }; too many → LOCKED { retryAfterSeconds }. */
export const SignInRequest = z.object({ email: Email, password: Password });
export type SignInRequest = z.infer<typeof SignInRequest>;

/** `POST /auth/google` · `POST /auth/apple` — the provider's credential (ID token / authorisation code). */
export const ProviderSignInRequest = z.object({ credential: z.string().min(1).max(4096) });

/**
 * `POST /auth/register` — terms accepted (unticked by default; KVKK notice linked, information
 * only); the password must meet the live rules (else VALIDATION on `password`). Always answers
 * VERIFY_EMAIL with the masked address, also for an e-mail that already has an account.
 */
export const SignUpRequest = z.object({
  email: Email,
  password: Password,
  acceptTerms: z.literal(true),
  termsVersion: z.string().min(1),
  /** The guest's language, copied to `users.locale` (architecture.md §19). */
  locale: ApiLocale,
});
export const EmailSent = z.object({
  emailMasked: z.string().min(1),
  /** "Tekrar gönder" is possible after this many seconds. */
  resendAfterSeconds: z.number().int().nonnegative(),
});
export type EmailSent = z.infer<typeof EmailSent>;

/** `POST /auth/verify-email` — the link from the e-mail; expired, used or unknown → LINK_INVALID (one page for all). */
export const VerifyEmailRequest = z.object({ token: LinkToken });

/** `POST /auth/verify-email/resend` · `POST /auth/password/forgot` — same answer whether or not an account exists. */
export const EmailRequest = z.object({ email: Email });

/** `GET /auth/password/reset?token=` — the new-password page shows the masked address; bad link → LINK_INVALID. */
export const PasswordResetQuery = z.object({ token: LinkToken });
export const PasswordResetContext = z.object({ emailMasked: z.string().min(1) });

/** `POST /auth/password/reset` — sets the password and signs out every device ("Şifren değişti · tüm cihazlardan çıkış yapıldı"). */
export const PasswordResetRequest = z.object({ token: LinkToken, password: Password });
export const PasswordResetResult = z.object({ status: z.literal("PASSWORD_CHANGED"), sessionsRevoked: z.literal(true) });

/** `POST /me/restore` (with the challenge) → SIGNED_IN; `POST /auth/deletion/keep` → deletion stays scheduled. */
export const ChallengeRequest = z.object({ challenge: AccountChallenge });
export const DeletionKept = z.object({ status: z.literal("DELETION_KEPT"), purgeAfter: Timestamp });

/** `POST /auth/suspended/export` — "Verilerimi indir": prepared in the background, ready → e-mail (Settings › export). */
export const ExportRequested = z.object({ status: z.literal("PREPARING"), requestId: Id });

/** `POST /auth/logout`. */
export const SignedOut = z.object({ status: z.literal("SIGNED_OUT") });
