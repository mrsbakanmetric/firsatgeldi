// Endpoint registry: one entry per API endpoint with its request/response
// schemas, permission key, guest allow-list flag, idempotency and activity
// action. The typed client, the mock API and (Phase 2) the API server and its
// OpenAPI document are all derived from this list (architecture.md §15, §16).
import { z } from "zod";
import { ActivityAction } from "./activity";
import {
  AuthPolicy,
  ChallengeRequest,
  DeletionKept,
  EmailRequest,
  EmailSent,
  ExportRequested,
  PasswordResetContext,
  PasswordResetQuery,
  PasswordResetRequest,
  PasswordResetResult,
  ProviderSignInRequest,
  SignedOut,
  SignInRequest,
  SignInResult,
  SignUpRequest,
  VerifyEmailRequest,
} from "./auth";
import { EntitlementSummary } from "./envelope";
import { ApiLocale, Id, ImageSha256, ImageVariant } from "./common";
import { IdentifyAnswer, IdentifyRequest, IdentifyResult } from "./identify";
import { HomeView } from "./home";
import { GoResult, HideResult, OfferRef, RevealResult } from "./offers";
import {
  CreateReportRequest,
  CreateReportResult,
  DeliveredRequest,
  DeliveredResult,
  DetailOffers,
  ExtendRequest,
  ExtendResult,
  FeedbackRequest,
  FeedbackResult,
  HistoryRange,
  NotifyBackInStockResult,
  PriceDifferenceMessage,
  PriceHistoryDetail,
  ProductRatings,
  StepParams,
  StepRequest,
  StepResult,
  StockHistoryDetail,
  StockHistoryRange,
  TrackedItemDetail,
  UpdateRequestRequest,
  UpdateRequestResult,
  UpdateTrackedItemRequest,
} from "./product-detail";
import {
  DeliveryAnswerRequest,
  DeliveryAnswerResult,
  DeliveryStatus,
  ForYou,
  NotificationDetail,
  NotificationList,
  NotificationsQuery,
  ReadAllResult,
  ReadResult,
  UnreadCount,
} from "./notifications";
import type { PermissionKey } from "./permissions";
import {
  CommunityConsents,
  FollowChange,
  Followers,
  Following,
  FollowRequests,
  LinkSubmissions,
  LinkSubmissionsQuery,
  MyProfile,
  PeopleQuery,
  UserParams,
} from "./profile";
import { AutocompleteQuery, AutocompleteResult, ProductView, SimilarProducts } from "./products";
import { Me, SearchHistory, SearchHistoryQuery } from "./session";
import {
  AccountAccess,
  AdminActivity,
  AdminActivityQuery,
  ChangeEmailRequest,
  ChangePasswordRequest,
  CookieConsent,
  DataExport,
  DeleteAccountRequest,
  DeletionPreview,
  DeletionScheduled,
  ExportLink,
  LatestExport,
  LinkIdentityRequest,
  NotificationPreferences,
  OwnPermissions,
  OwnPii,
  PasswordChanged,
  ProviderParams,
  ReauthRequest,
  ReauthResult,
  SearchHidden,
  SecurityView,
  SessionRevoked,
  UpdateCookieConsent,
  UpdateMeRequest,
  UpdateNotificationPreferences,
  UsernameCheck,
  UsernameCheckQuery,
} from "./settings";
import {
  CheckNowBulkRequest,
  CheckNowBulkResult,
  CheckNowResult,
  ConfirmContext,
  CreateTrackedItemRequest,
  EndTrackingRequest,
  EndTrackingResult,
  MarkBoughtRequest,
  RestoreTrackingResult,
  SellerLookupRequest,
  SellerLookupResult,
  TeaserRequest,
  TeaserResult,
  TrackedItemCreated,
  TrackedItemList,
  TrackedItemListQuery,
  TrackedItemsSummary,
} from "./tracking";
import { CompleteUploadRequest, CompleteUploadResult, PresignRequest, PresignResult, UploadPolicy, UploadPolicyQuery, UploadView } from "./uploads";

/** API prefix (architecture.md §15.4). */
export const API_PREFIX = "/api/v1";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * How the response body is shaped:
 * json = response envelope · binary = file (image) · stream = Server-Sent Events.
 */
export type ResponseKind = "json" | "binary" | "stream";

export interface EndpointDefinition {
  readonly method: HttpMethod;
  /** Path after API_PREFIX, Express-style params (`/products/:id`). */
  readonly path: string;
  readonly params: z.ZodObject | null;
  readonly query: z.ZodObject | null;
  readonly body: z.ZodType | null;
  /** Schema of `data` in the envelope (json), or null (binary/stream). */
  readonly response: z.ZodType | null;
  readonly kind: ResponseKind;
  /** Permission key checked on the server for signed-in callers (database.md §4). */
  readonly permission: PermissionKey;
  /** On the explicit public allow-list: reachable without a session (architecture.md §15.1). */
  readonly public: boolean;
  /** Requires an `Idempotency-Key` header (architecture.md §15.3). */
  readonly idempotent: boolean;
  /** Activity history action written for every call (database.md §14a); null = read without a log row. */
  readonly activity: ActivityAction | null;
  /**
   * Other actions the handler may write instead of `activity` for some requests (one row per call):
   * the delivery answer logs "Evet, aldım" as `tracking.delivered`, "Henüz değil" as its own action.
   */
  readonly activityVariants?: readonly ActivityAction[];
  /** The response can contain offers: scanned by the hidden-seller leak test (architecture.md §6.5). */
  readonly returnsOffers: boolean;
}

function endpoint<const T extends EndpointDefinition>(definition: T): T {
  return definition;
}

const IdParams = z.object({ id: Id });
const RefParams = z.object({ ref: OfferRef });
const NONE = { params: null, query: null, body: null } as const;
const READ = { idempotent: false, activity: null, returnsOffers: false, kind: "json" } as const;

export const ENDPOINTS = {
  // ME
  getMe: endpoint({ method: "GET", path: "/me", ...NONE, response: Me, ...READ, permission: "account.own.view", public: false }),
  getEntitlements: endpoint({
    method: "GET", path: "/me/entitlements", ...NONE, response: EntitlementSummary, ...READ,
    permission: "packages.own.view", public: false,
  }),
  getSearchHistory: endpoint({
    method: "GET", path: "/me/search-history", params: null, query: SearchHistoryQuery, body: null,
    response: SearchHistory, ...READ, permission: "account.own.view", public: false,
  }),

  // SETTINGS AND ACCOUNT (architecture.md §16 ME; modules.md Settings and Account; design v2.1).
  // Endpoints not named in §16 (`/me/access`, `/me/permissions`, export link) and every shape are
  // [ASSUMPTION] until §16.1. Sensitive ones need a fresh re-authentication (REAUTH_REQUIRED).
  updateMe: endpoint({
    method: "PATCH", path: "/me", params: null, query: null, body: UpdateMeRequest,
    response: Me, ...READ, activity: "settings.change", permission: "account.own.write", public: false,
  }),
  checkUsername: endpoint({
    method: "GET", path: "/me/username-check", params: null, query: UsernameCheckQuery, body: null,
    response: UsernameCheck, ...READ, permission: "account.own.write", public: false,
  }),
  getAccess: endpoint({ method: "GET", path: "/me/access", ...NONE, response: AccountAccess, ...READ, permission: "account.own.view", public: false }),
  reauth: endpoint({
    method: "POST", path: "/me/reauth", params: null, query: null, body: ReauthRequest,
    response: ReauthResult, ...READ, activity: "account.reauth", permission: "account.own.view_pii", public: false,
  }),
  // A read that writes a log row: every reveal of the own full e-mail / phone is recorded.
  getOwnPii: endpoint({ method: "GET", path: "/me/pii", ...NONE, response: OwnPii, ...READ, activity: "account.pii_view", permission: "account.own.view_pii", public: false }),
  changeEmail: endpoint({
    method: "PATCH", path: "/me/email", params: null, query: null, body: ChangeEmailRequest,
    response: AccountAccess, ...READ, activity: "account.email_change", permission: "account.own.write", public: false,
  }),
  resendEmailChange: endpoint({
    method: "POST", path: "/me/email/resend", ...NONE, response: AccountAccess, ...READ, activity: "account.email_change_resend", permission: "account.own.write", public: false,
  }),
  cancelEmailChange: endpoint({
    method: "DELETE", path: "/me/email/pending", ...NONE, response: AccountAccess, ...READ, activity: "account.email_change_cancel", permission: "account.own.write", public: false,
  }),
  changePassword: endpoint({
    method: "POST", path: "/me/password", params: null, query: null, body: ChangePasswordRequest,
    response: PasswordChanged, ...READ, activity: "auth.password_change", permission: "account.own.write", public: false,
  }),
  createPasswordLink: endpoint({
    method: "POST", path: "/me/password/create-link", ...NONE, response: EmailSent, ...READ, activity: "auth.password_create_link", permission: "account.own.write", public: false,
  }),
  linkIdentity: endpoint({
    method: "POST", path: "/me/identities/:provider", params: ProviderParams, query: null, body: LinkIdentityRequest,
    response: AccountAccess, ...READ, activity: "account.identity_link", permission: "account.own.write", public: false,
  }),
  unlinkIdentity: endpoint({
    method: "DELETE", path: "/me/identities/:provider", params: ProviderParams, query: null, body: null,
    response: AccountAccess, ...READ, activity: "account.identity_unlink", permission: "account.own.write", public: false,
  }),
  getSecurity: endpoint({ method: "GET", path: "/me/security", ...NONE, response: SecurityView, ...READ, permission: "account.own.view", public: false }),
  revokeSession: endpoint({
    method: "DELETE", path: "/me/sessions/:id", params: IdParams, query: null, body: null,
    response: SessionRevoked, ...READ, activity: "auth.session_revoke", permission: "account.own.write", public: false,
  }),
  signOutOthers: endpoint({
    method: "POST", path: "/me/sessions/sign-out-others", ...NONE, response: SessionRevoked, ...READ, idempotent: true, activity: "auth.sign_out_others", permission: "account.own.write", public: false,
  }),
  hideSearch: endpoint({
    method: "POST", path: "/me/search-history/:id/hide", params: IdParams, query: null, body: null,
    response: SearchHidden, ...READ, activity: "search_history.hide", permission: "search_history.own.hide", public: false,
  }),
  unhideSearch: endpoint({
    method: "POST", path: "/me/search-history/:id/unhide", params: IdParams, query: null, body: null,
    response: SearchHidden, ...READ, activity: "search_history.unhide", permission: "search_history.own.hide", public: false,
  }),
  getNotificationPreferences: endpoint({
    method: "GET", path: "/me/notification-preferences", ...NONE, response: NotificationPreferences, ...READ, permission: "account.own.view", public: false,
  }),
  updateNotificationPreferences: endpoint({
    method: "PUT", path: "/me/notification-preferences", params: null, query: null, body: UpdateNotificationPreferences,
    response: NotificationPreferences, ...READ, activity: "settings.change", permission: "notification_prefs.own.write", public: false,
  }),
  getCookieConsent: endpoint({ method: "GET", path: "/me/cookie-consent", ...NONE, response: CookieConsent, ...READ, permission: "account.own.view", public: false }),
  updateCookieConsent: endpoint({
    method: "PUT", path: "/me/cookie-consent", params: null, query: null, body: UpdateCookieConsent,
    response: CookieConsent, ...READ, activity: "consent.accept", permission: "consent.own.write", public: false,
  }),
  requestExport: endpoint({
    method: "POST", path: "/me/export", ...NONE, response: DataExport, ...READ, idempotent: true, activity: "account.export", permission: "account.own.export", public: false,
  }),
  getLatestExport: endpoint({ method: "GET", path: "/me/export", ...NONE, response: LatestExport, ...READ, permission: "account.own.export", public: false }),
  getExportLink: endpoint({
    method: "POST", path: "/me/export/:id/link", params: IdParams, query: null, body: null,
    response: ExportLink, ...READ, activity: "account.export_download", permission: "account.own.export", public: false,
  }),
  getDeletionPreview: endpoint({ method: "GET", path: "/me/deletion-preview", ...NONE, response: DeletionPreview, ...READ, permission: "account.own.delete", public: false }),
  deleteAccount: endpoint({
    method: "DELETE", path: "/me", params: null, query: null, body: DeleteAccountRequest,
    response: DeletionScheduled, ...READ, idempotent: true, activity: "account.delete", permission: "account.own.delete", public: false,
  }),
  getOwnPermissions: endpoint({ method: "GET", path: "/me/permissions", ...NONE, response: OwnPermissions, ...READ, permission: "admin.self.permissions.view", public: false }),
  getAdminActivity: endpoint({
    method: "GET", path: "/me/admin-activity", params: null, query: AdminActivityQuery, body: null,
    response: AdminActivity, ...READ, permission: "admin.self.activity.view", public: false,
  }),
  // NOTIFICATIONS (step 13; modules.md Notifications and Preferences; architecture.md §16).
  // Preview, "Senin için", delivery status and the delivery answer are [ASSUMPTION] until §16.1.
  // Fixed paths come before `/notifications/:id`.
  getNotifications: endpoint({
    method: "GET", path: "/notifications", params: null, query: NotificationsQuery, body: null, response: NotificationList, ...READ, permission: "notifications.own.view", public: false,
  }),
  getUnreadCount: endpoint({ method: "GET", path: "/notifications/unread-count", ...NONE, response: UnreadCount, ...READ, permission: "notifications.own.view", public: false }),
  getForYou: endpoint({ method: "GET", path: "/notifications/for-you", ...NONE, response: ForYou, ...READ, permission: "notifications.own.view", public: false }),
  getDeliveryStatus: endpoint({ method: "GET", path: "/notifications/delivery-status", ...NONE, response: DeliveryStatus, ...READ, permission: "notifications.own.view", public: false }),
  readAllNotifications: endpoint({
    method: "POST", path: "/notifications/read-all", ...NONE, response: ReadAllResult, ...READ, idempotent: true, activity: "notification.read_all", permission: "notifications.own.write", public: false,
  }),
  getNotification: endpoint({ method: "GET", path: "/notifications/:id", params: IdParams, query: null, body: null, response: NotificationDetail, ...READ, permission: "notifications.own.view", public: false }),
  readNotification: endpoint({
    method: "PATCH", path: "/notifications/:id/read", params: IdParams, query: null, body: null, response: ReadResult, ...READ, activity: "notification.read", permission: "notifications.own.write", public: false,
  }),
  answerDeliveryPrompt: endpoint({
    method: "POST", path: "/notifications/:id/delivery-answer", params: IdParams, query: null, body: DeliveryAnswerRequest,
    response: DeliveryAnswerResult, ...READ, activity: "tracking.delivered", activityVariants: ["notification.delivery_later"], permission: "tracking.own.write", public: false,
  }),
  // MY PROFILE (Profilim, step 21a; modules.md Profile and Following; architecture.md §16 COMMUNITY).
  // Own-profile reads, remove follower and the "Geri al" restores are [ASSUMPTION] until §16.1.
  getMyProfile: endpoint({ method: "GET", path: "/me/profile", ...NONE, response: MyProfile, ...READ, permission: "account.own.view", public: false }),
  getFollowers: endpoint({
    method: "GET", path: "/me/followers", params: null, query: PeopleQuery, body: null, response: Followers, ...READ, permission: "account.own.view", public: false,
  }),
  getFollowing: endpoint({
    method: "GET", path: "/me/following", params: null, query: PeopleQuery, body: null, response: Following, ...READ, permission: "account.own.view", public: false,
  }),
  getFollowRequests: endpoint({ method: "GET", path: "/me/follow-requests", ...NONE, response: FollowRequests, ...READ, permission: "account.own.view", public: false }),
  approveFollow: endpoint({
    method: "POST", path: "/follows/:userId/approve", params: UserParams, query: null, body: null,
    response: FollowChange, ...READ, activity: "follow.approve", permission: "follows.own.write", public: false,
  }),
  declineFollow: endpoint({
    method: "POST", path: "/follows/:userId/decline", params: UserParams, query: null, body: null,
    response: FollowChange, ...READ, activity: "follow.decline", permission: "follows.own.write", public: false,
  }),
  unfollow: endpoint({
    method: "DELETE", path: "/follows/:userId", params: UserParams, query: null, body: null,
    response: FollowChange, ...READ, activity: "follow.delete", permission: "follows.own.write", public: false,
  }),
  restoreFollow: endpoint({
    method: "POST", path: "/follows/:userId/restore", params: UserParams, query: null, body: null,
    response: FollowChange, ...READ, activity: "follow.restore", permission: "follows.own.write", public: false,
  }),
  removeFollower: endpoint({
    method: "DELETE", path: "/me/followers/:userId", params: UserParams, query: null, body: null,
    response: FollowChange, ...READ, activity: "follower.remove", permission: "follows.own.write", public: false,
  }),
  restoreFollower: endpoint({
    method: "POST", path: "/me/followers/:userId/restore", params: UserParams, query: null, body: null,
    response: FollowChange, ...READ, activity: "follower.restore", permission: "follows.own.write", public: false,
  }),
  getMyLinkSubmissions: endpoint({
    method: "GET", path: "/me/link-submissions", params: null, query: LinkSubmissionsQuery, body: null,
    response: LinkSubmissions, ...READ, permission: "account.own.view", public: false,
  }),
  getCommunityConsents: endpoint({ method: "GET", path: "/me/community-consents", ...NONE, response: CommunityConsents, ...READ, permission: "account.own.view", public: false }),
  stream: endpoint({
    method: "GET", path: "/me/stream", ...NONE, response: null, ...READ, kind: "stream",
    // Signed-in users only; guests poll instead [DECIDED 2026-11-14] (architecture.md §13, §16.1).
    permission: "account.own.view", public: false,
  }),

  // AUTH (architecture.md §16 AUTH, §17; modules.md Sign-in and Sign-up). Signed-out flows on the
  // public allow-list with `auth.use`. Phase 1: answered by the mock API (mock sign-in); the
  // policy read, the reset-link read, the resend, the deletion choice and the suspended export
  // are [ASSUMPTION — endpoints]. Not in step 20: Application Manager two-step sign-in, re-consent.
  getAuthPolicy: endpoint({ method: "GET", path: "/auth/policy", ...NONE, response: AuthPolicy, ...READ, permission: "auth.use", public: true }),
  signIn: endpoint({
    method: "POST", path: "/auth/login", params: null, query: null, body: SignInRequest,
    response: SignInResult, ...READ, activity: "auth.sign_in", permission: "auth.use", public: true,
  }),
  signInWithGoogle: endpoint({
    method: "POST", path: "/auth/google", params: null, query: null, body: ProviderSignInRequest,
    response: SignInResult, ...READ, activity: "auth.sign_in", permission: "auth.use", public: true,
  }),
  signInWithApple: endpoint({
    method: "POST", path: "/auth/apple", params: null, query: null, body: ProviderSignInRequest,
    response: SignInResult, ...READ, activity: "auth.sign_in", permission: "auth.use", public: true,
  }),
  signUp: endpoint({
    method: "POST", path: "/auth/register", params: null, query: null, body: SignUpRequest,
    response: EmailSent, ...READ, idempotent: true, activity: "auth.sign_up", permission: "auth.use", public: true,
  }),
  verifyEmail: endpoint({
    method: "POST", path: "/auth/verify-email", params: null, query: null, body: VerifyEmailRequest,
    response: SignInResult, ...READ, activity: "auth.verify_email", permission: "auth.use", public: true,
  }),
  resendVerification: endpoint({
    method: "POST", path: "/auth/verify-email/resend", params: null, query: null, body: EmailRequest,
    response: EmailSent, ...READ, activity: "auth.verify_resend", permission: "auth.use", public: true,
  }),
  forgotPassword: endpoint({
    method: "POST", path: "/auth/password/forgot", params: null, query: null, body: EmailRequest,
    response: EmailSent, ...READ, activity: "auth.password_forgot", permission: "auth.use", public: true,
  }),
  getPasswordReset: endpoint({
    method: "GET", path: "/auth/password/reset", params: null, query: PasswordResetQuery, body: null,
    response: PasswordResetContext, ...READ, permission: "auth.use", public: true,
  }),
  resetPassword: endpoint({
    method: "POST", path: "/auth/password/reset", params: null, query: null, body: PasswordResetRequest,
    response: PasswordResetResult, ...READ, activity: "auth.password_reset", permission: "auth.use", public: true,
  }),
  restoreAccount: endpoint({
    method: "POST", path: "/me/restore", params: null, query: null, body: ChallengeRequest,
    response: SignInResult, ...READ, idempotent: true, activity: "account.restore", permission: "auth.use", public: true,
  }),
  keepDeletion: endpoint({
    method: "POST", path: "/auth/deletion/keep", params: null, query: null, body: ChallengeRequest,
    response: DeletionKept, ...READ, idempotent: true, activity: "account.restore_declined", permission: "auth.use", public: true,
  }),
  exportSuspendedAccount: endpoint({
    method: "POST", path: "/auth/suspended/export", params: null, query: null, body: ChallengeRequest,
    response: ExportRequested, ...READ, idempotent: true, activity: "account.export", permission: "auth.use", public: true,
  }),
  signOut: endpoint({
    method: "POST", path: "/auth/logout", ...NONE, response: SignedOut, ...READ, activity: "auth.sign_out", permission: "auth.use", public: false,
  }),

  // IDENTIFY, SEARCH AND UPLOADS
  autocomplete: endpoint({
    method: "GET", path: "/search/autocomplete", params: null, query: AutocompleteQuery, body: null,
    response: AutocompleteResult, ...READ, activity: "search", permission: "search.use", public: true,
  }),
  getUploadPolicy: endpoint({
    // [ASSUMPTION — endpoint] limits stated before an upload; a read, no activity row.
    method: "GET", path: "/uploads/policy", params: null, query: UploadPolicyQuery, body: null,
    response: UploadPolicy, ...READ, permission: "upload.own.create", public: true,
  }),
  presignUploads: endpoint({
    method: "POST", path: "/uploads/presign", params: null, query: null, body: PresignRequest,
    response: PresignResult, ...READ, activity: "upload", permission: "upload.own.create", public: true,
  }),
  completeUploads: endpoint({
    method: "POST", path: "/uploads/complete", params: null, query: null, body: CompleteUploadRequest,
    response: CompleteUploadResult, ...READ, idempotent: true, activity: "upload", permission: "upload.own.create", public: true,
  }),
  getUpload: endpoint({
    // Own uploads only (guest: own session; user: own account); every read is logged [DECIDED 2026-11-14] (architecture.md §11a, §16.1).
    method: "GET", path: "/uploads/:id", params: IdParams, query: null, body: null,
    response: UploadView, ...READ, activity: "upload.status", permission: "upload.own.view", public: true,
  }),
  image: endpoint({
    method: "GET", path: "/img/:sha256/:variant", params: z.object({ sha256: ImageSha256, variant: ImageVariant }), query: null, body: null,
    response: null, ...READ, kind: "binary", permission: "catalog.view", public: true,
  }),
  identify: endpoint({
    method: "POST", path: "/identify", params: null, query: null, body: IdentifyRequest,
    response: IdentifyResult, ...READ, activity: "identify", permission: "identify.use", public: true,
  }),
  answerIdentify: endpoint({
    method: "POST", path: "/identify/:requestId/answer", params: z.object({ requestId: Id }), query: null, body: IdentifyAnswer,
    response: IdentifyResult, ...READ, activity: "identify", permission: "identify.use", public: true,
  }),
  getProduct: endpoint({
    method: "GET", path: "/products/:id", params: IdParams, query: null, body: null,
    response: ProductView, ...READ, permission: "catalog.view", public: true,
  }),
  getSimilarProducts: endpoint({
    method: "GET", path: "/products/:id/similar", params: IdParams, query: null, body: null,
    response: SimilarProducts, ...READ, permission: "catalog.view", public: true,
  }),
  getProductRatings: endpoint({
    // Seller-less aggregate across stores (modules.md Ratings › Before Göster); public like the product.
    method: "GET", path: "/products/:id/ratings", params: IdParams, query: null, body: null,
    response: ProductRatings, ...READ, permission: "catalog.view", public: true,
  }),

  // CONFIRM AND TRACKING
  getConfirmContext: endpoint({
    method: "GET", path: "/products/:id/confirm-context", params: IdParams, query: null, body: null,
    response: ConfirmContext, ...READ, permission: "tracking.own.write", public: false,
  }),
  sellerLookup: endpoint({
    method: "POST", path: "/products/:id/seller-lookup", params: IdParams, query: null, body: SellerLookupRequest,
    response: SellerLookupResult, ...READ, activity: "seller_lookup", permission: "tracking.own.write", public: false,
  }),
  teaser: endpoint({
    method: "POST", path: "/products/:id/teaser", params: IdParams, query: null, body: TeaserRequest,
    response: TeaserResult, ...READ, activity: "teaser", returnsOffers: true, permission: "tracking.own.write", public: false,
  }),
  createTrackedItem: endpoint({
    method: "POST", path: "/tracked-items", params: null, query: null, body: CreateTrackedItemRequest,
    response: TrackedItemCreated, ...READ, idempotent: true, activity: "tracking.confirm", permission: "tracking.own.write", public: false,
  }),

  // TRACKED ITEMS (implementation_plan.md Appendix B.3)
  listTrackedItems: endpoint({
    method: "GET", path: "/tracked-items", params: null, query: TrackedItemListQuery, body: null,
    response: TrackedItemList, ...READ, permission: "tracking.own.view", public: false,
  }),
  getTrackedItemsSummary: endpoint({
    method: "GET", path: "/tracked-items/summary", ...NONE, response: TrackedItemsSummary, ...READ,
    permission: "tracking.own.view", public: false,
  }),
  checkNow: endpoint({
    // Idempotent [ASSUMPTION]: a repeated tap never spends the daily allowance twice.
    method: "POST", path: "/tracked-items/:id/check-now", params: IdParams, query: null, body: null,
    response: CheckNowResult, ...READ, idempotent: true, activity: "check_now", permission: "checknow.own.use", public: false,
  }),
  checkNowBulk: endpoint({
    // Idempotent [ASSUMPTION]: a repeated tap never spends the daily allowance twice.
    method: "POST", path: "/tracked-items/check-now-bulk", params: null, query: null, body: CheckNowBulkRequest,
    response: CheckNowBulkResult, ...READ, idempotent: true, activity: "check_now_bulk", permission: "checknow.own.use", public: false,
  }),
  endTracking: endpoint({
    method: "POST", path: "/tracked-items/:id/end", params: IdParams, query: null, body: EndTrackingRequest,
    response: EndTrackingResult, ...READ, idempotent: true, activity: "tracking.end", permission: "tracking.own.write", public: false,
  }),
  markBought: endpoint({
    method: "POST", path: "/tracked-items/:id/bought", params: IdParams, query: null, body: MarkBoughtRequest,
    response: TrackedItemCreated, ...READ, idempotent: true, activity: "tracking.bought", permission: "tracking.own.write", public: false,
  }),
  restoreTracking: endpoint({
    // [ASSUMPTION — endpoint] "Geri al" within 7 days of ending (Tracked Items v3).
    method: "POST", path: "/tracked-items/:id/restore", params: IdParams, query: null, body: null,
    response: RestoreTrackingResult, ...READ, idempotent: true, activity: "tracking.restore", permission: "tracking.own.write", public: false,
  }),

  // PRODUCT DETAIL (implementation_plan.md Appendix B.2; modules.md Product Detail). Registered after
  // the list routes, so `/tracked-items/summary` is never read as an id. Shapes [ASSUMPTION].
  getTrackedItem: endpoint({
    method: "GET", path: "/tracked-items/:id", params: IdParams, query: null, body: null,
    response: TrackedItemDetail, ...READ, permission: "tracking.own.view", public: false,
  }),
  getTrackedItemOffers: endpoint({
    method: "GET", path: "/tracked-items/:id/offers", params: IdParams, query: null, body: null,
    response: DetailOffers, ...READ, returnsOffers: true, permission: "tracking.own.view", public: false,
  }),
  getPriceHistory: endpoint({
    method: "GET", path: "/tracked-items/:id/price-history", params: IdParams, query: z.object({ range: HistoryRange }), body: null,
    response: PriceHistoryDetail, ...READ, permission: "tracking.own.view", public: false,
  }),
  getStockHistory: endpoint({
    method: "GET", path: "/tracked-items/:id/stock-history", params: IdParams, query: z.object({ range: StockHistoryRange }), body: null,
    response: StockHistoryDetail, ...READ, permission: "tracking.own.view", public: false,
  }),
  getPriceDifferenceMessage: endpoint({
    method: "GET", path: "/tracked-items/:id/price-difference-message", params: IdParams, query: z.object({ locale: ApiLocale }), body: null,
    response: PriceDifferenceMessage, ...READ, permission: "tracking.own.view", public: false,
  }),
  getCalendar: endpoint({
    // "Takvime ekle": the last return day as an .ics file, reminder one day before (modules.md v1 helpers).
    method: "GET", path: "/tracked-items/:id/calendar.ics", params: IdParams, query: null, body: null,
    response: null, ...READ, kind: "binary", permission: "tracking.own.view", public: false,
  }),
  updateTrackedItem: endpoint({
    method: "PATCH", path: "/tracked-items/:id", params: IdParams, query: null, body: UpdateTrackedItemRequest,
    response: TrackedItemDetail, ...READ, activity: "tracking.edit", permission: "tracking.own.write", public: false,
  }),
  answerDelivered: endpoint({
    method: "POST", path: "/tracked-items/:id/delivered", params: IdParams, query: null, body: DeliveredRequest,
    response: DeliveredResult, ...READ, activity: "tracking.delivered", permission: "tracking.own.write", public: false,
  }),
  tickStep: endpoint({
    method: "POST", path: "/tracked-items/:id/steps/:step", params: StepParams, query: null, body: StepRequest,
    response: StepResult, ...READ, activity: "tracking.step", permission: "tracking.own.write", public: false,
  }),
  updateRequest: endpoint({
    method: "PATCH", path: "/tracked-items/:id/request", params: IdParams, query: null, body: UpdateRequestRequest,
    response: UpdateRequestResult, ...READ, activity: "tracking.request", permission: "tracking.own.write", public: false,
  }),
  extendTracking: endpoint({
    method: "POST", path: "/tracked-items/:id/extend", params: IdParams, query: null, body: ExtendRequest,
    response: ExtendResult, ...READ, idempotent: true, activity: "tracking.extend", permission: "tracking.own.write", public: false,
  }),
  sendFeedback: endpoint({
    method: "POST", path: "/tracked-items/:id/feedback", params: IdParams, query: null, body: FeedbackRequest,
    response: FeedbackResult, ...READ, idempotent: true, activity: "feedback.create", permission: "feedback.own.write", public: false,
  }),
  createReport: endpoint({
    method: "POST", path: "/reports", params: null, query: null, body: CreateReportRequest,
    response: CreateReportResult, ...READ, idempotent: true, activity: "report.create", permission: "report.own.create", public: false,
  }),
  notifyBackInStock: endpoint({
    method: "POST", path: "/offers/:ref/notify-back-in-stock", params: RefParams, query: null, body: null,
    response: NotifyBackInStockResult, ...READ, idempotent: true, activity: "offer.notify_back_in_stock", permission: "tracking.own.write", public: false,
  }),

  // HOME (modules.md Home; architecture.md §16.1 HomeView). Hemen Gözat carries hidden offers.
  getHome: endpoint({
    method: "GET", path: "/home", ...NONE, response: HomeView, ...READ, returnsOffers: true, permission: "home.own.view", public: false,
  }),

  // REVEAL AND OFFERS
  revealOffer: endpoint({
    method: "POST", path: "/offers/:ref/reveal", params: RefParams, query: null, body: null,
    response: RevealResult, ...READ, idempotent: true, activity: "reveal", returnsOffers: true, permission: "reveal.own.use", public: false,
  }),
  hideOffer: endpoint({
    method: "POST", path: "/offers/:ref/hide", params: RefParams, query: null, body: null,
    response: HideResult, ...READ, activity: "reveal.hide", returnsOffers: true, permission: "reveal.own.use", public: false,
  }),
  goToOffer: endpoint({
    method: "POST", path: "/offers/:ref/go", params: RefParams, query: null, body: null,
    response: GoResult, ...READ, activity: "offer.go", returnsOffers: true, permission: "offer.own.go", public: false,
  }),
} as const satisfies Record<string, EndpointDefinition>;

export type Endpoints = typeof ENDPOINTS;
export type EndpointName = keyof Endpoints;

type InferOr<S, Fallback> = S extends z.ZodType ? z.input<S> : Fallback;

export type EndpointParams<N extends EndpointName> = InferOr<Endpoints[N]["params"], undefined>;
export type EndpointQuery<N extends EndpointName> = InferOr<Endpoints[N]["query"], undefined>;
export type EndpointBody<N extends EndpointName> = InferOr<Endpoints[N]["body"], undefined>;
export type EndpointData<N extends EndpointName> = Endpoints[N]["response"] extends z.ZodType ? z.output<Endpoints[N]["response"]> : never;

/** Endpoints whose body is the JSON envelope (the typed client calls these). */
export type JsonEndpointName = { [N in EndpointName]: Endpoints[N]["kind"] extends "json" ? N : never }[EndpointName];

/** Fills `:name` segments; values are URL-encoded. */
export function buildPath(path: string, params: Readonly<Record<string, string>> | undefined): string {
  return path.replace(/:(\w+)/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${path}`);
    return encodeURIComponent(value);
  });
}

/** Catalogue image URL (architecture.md §11a): the URL never reveals the platform. */
export function imagePath(sha256: string, variant: ImageVariant): string {
  return API_PREFIX + buildPath(ENDPOINTS.image.path, { sha256, variant });
}
