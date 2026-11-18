// Action logging (CLAUDE.md core rule 9; database.md §14, §14a). Every user
// action is written to the activity history; the API interceptor writes it
// asynchronously in Phase 2, the mock API keeps the same rows in memory.
import { z } from "zod";
import { Id, Timestamp } from "./common";

/**
 * Activity actions (database.md §14a `activity_events.action`). Listed there:
 * search, identify, upload, upload.status [DECIDED 2026-11-14], tracking.confirm,
 * reveal, offer.go, check_now, check_now_bulk, tracking.end … `seller_lookup`, `teaser` and `reveal.hide` are
 * [ASSUMPTION] names for Search and Add actions the docs do not name yet.
 */
export const ACTIVITY_ACTIONS = [
  "search",
  "identify",
  "upload",
  "upload.status",
  "seller_lookup",
  "teaser",
  "tracking.confirm",
  "reveal",
  "reveal.hide",
  "offer.go",
  "check_now",
  "check_now_bulk",
  "tracking.end",
  /** "Geri al" after ending tracking [ASSUMPTION — action name]. */
  "tracking.restore",
  /** "Aldım, kaydet" on a want-to-buy item [ASSUMPTION — action name]. */
  "tracking.bought",
  // Product Detail (implementation_plan.md Appendix B.2). `report.create` is listed in database.md §14a;
  // the others are [ASSUMPTION — action names] until database.md §14a lists them.
  /** Price paid, order status, last day or target corrected. */
  "tracking.edit",
  /** "Teslim aldın mı?" answered. */
  "tracking.delivered",
  /** An action step ticked or unticked ("Yaptım ✓"). */
  "tracking.step",
  /** Request tracking: "Fiyat farkı istedim" / "İade talebi açtım" and the outcome. */
  "tracking.request",
  /** Want-to-buy tracking extended. */
  "tracking.extend",
  /** The two optional buyer questions answered. */
  "feedback.create",
  /** "Yanlış fiyat bildir" / "Farklı ürün bildir". */
  "report.create",
  /** "Stoğa gelince haber ver" on an offer. */
  "offer.notify_back_in_stock",
  // Sign-in and Sign-up. `auth.sign_in` is listed in database.md §14a; the others are
  // [ASSUMPTION — action names]. Rows keep the e-mail domain only, never the address or password.
  /** Every sign-in attempt (e-mail, Google, Apple); metadata { method, result }. */
  "auth.sign_in",
  /** "Hesap oluştur"; metadata { termsVersion } — the consent itself is a `user_consents` row. */
  "auth.sign_up",
  /** The verification link opened. */
  "auth.verify_email",
  /** "Bağlantıyı tekrar gönder". */
  "auth.verify_resend",
  /** "Bağlantı gönder" on "Şifreni sıfırla". */
  "auth.password_forgot",
  /** "Şifreyi kaydet" on the new-password page. */
  "auth.password_reset",
  "auth.sign_out",
  /** "Hesabımı geri aç". */
  "account.restore",
  /** "Vazgeç, silinsin". */
  "account.restore_declined",
  /** "Verilerimi indir" (suspended account) · "Dosya hazırla" (Settings). */
  "account.export",
  // Settings and Account. `settings.change` and `consent.accept` are listed in database.md §14a;
  // the others are [ASSUMPTION — action names]. No row holds a full e-mail, phone or password.
  /** Profile, language, theme, privacy, notification preferences; metadata { section, fields }. */
  "settings.change",
  /** Cookie preferences; metadata { analytics, marketing, version }. */
  "consent.accept",
  /** Re-authentication before a sensitive action; metadata { method }. */
  "account.reauth",
  /** Own full e-mail / phone shown ("Göster"); every reveal is logged. */
  "account.pii_view",
  "account.email_change",
  "account.email_change_resend",
  "account.email_change_cancel",
  /** "Şifreyi değiştir"; metadata { otherSessionsRevoked }. */
  "auth.password_change",
  /** "Şifre oluştur" (account without a password): the link e-mail. */
  "auth.password_create_link",
  "account.identity_link",
  "account.identity_unlink",
  /** "Çıkış yap" on one device. */
  "auth.session_revoke",
  /** "Diğer cihazlardan çıkış yap". */
  "auth.sign_out_others",
  "search_history.hide",
  /** "Geri al" after hiding a search. */
  "search_history.unhide",
  /** "İndir (ZIP)": a download link of a ready export. */
  "account.export_download",
  /** "Hesabımı sil". */
  "account.delete",
  // Profilim (database.md §14a) [ASSUMPTION — action names]. Rows name the other person by id only.
  /** "Onayla" on a follow request; the requester gets the in-app FOLLOW_ACCEPTED notification. */
  "follow.approve",
  /** "Reddet" on a follow request; silent. */
  "follow.decline",
  /** "Takipten çık" or "İsteği geri al"; metadata { previous }; silent. */
  "follow.delete",
  /** "Geri al" after unfollowing or withdrawing: the follow returns as it was. */
  "follow.restore",
  /** "Takipten çıkar": a follower removed; silent. */
  "follower.remove",
  /** "Geri al" after removing a follower. */
  "follower.restore",
] as const;
export const ActivityAction = z.enum(ACTIVITY_ACTIONS);
export type ActivityAction = z.infer<typeof ActivityAction>;

/** Outcomes (database.md §14a `activity_events.outcome`). */
export const ActivityOutcome = z.enum(["OK", "DENIED", "LIMITED", "ERROR"]);
export type ActivityOutcome = z.infer<typeof ActivityOutcome>;

/** One `activity_events` row (database.md §14a); salted hashes only, never raw device or IP values. */
export const ActivityEvent = z.object({
  id: Id,
  occurredAt: Timestamp,
  userId: Id.nullable(),
  anonId: z.string().nullable(),
  sessionId: Id.nullable(),
  deviceHash: z.string().nullable(),
  ipHash: z.string().nullable(),
  platform: z.enum(["WEB", "MOBILE"]),
  action: ActivityAction,
  targetType: z.string().nullable(),
  targetId: Id.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  containsHiddenSeller: z.boolean(),
  outcome: ActivityOutcome,
});
export type ActivityEvent = z.infer<typeof ActivityEvent>;
