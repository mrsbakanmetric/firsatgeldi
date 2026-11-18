// Sign-in accounts of the mock API (development and tests only). Example addresses on the
// reserved ".test" domain, no real person's data; one shared development password.
// Each account shows one state of design "8 Giriş" after a correct password.
import { uuidFor } from "../ids";
import { SYSTEM_SETTINGS } from "../settings";
import type { MockState } from "../state";
import { USERS, type UserKey } from "./users";

/** The password of every mock account (not a secret: the mock never runs in production). */
export const MOCK_PASSWORD = "Deneme123";

export type AccountState = "ACTIVE" | "UNVERIFIED" | "PENDING_DELETION" | "SUSPENDED";

export interface AccountFixture {
  readonly email: string;
  readonly userId: string;
  /** Session the mock switches to when this account signs in (the other accounts borrow a fixture user's screens). */
  readonly session: UserKey;
  readonly state: AccountState;
  /** false = created with Google or Apple only (no password): e-mail sign-in gives the generic error. */
  readonly hasPassword: boolean;
  /** PENDING_DELETION: deletion requested this many days ago (`account.deletion_restore_days` window). */
  readonly deletionRequestedDaysAgo?: number;
  /** SUSPENDED: `users.suspended_reason` code; the screen words it from the catalogue. */
  readonly suspendedReason?: string;
}

function account(email: string, values: Omit<AccountFixture, "email" | "userId"> & { userId?: string }): AccountFixture {
  return { email, userId: values.userId ?? uuidFor(`account:${email}`), ...values };
}

export const ACCOUNT_LIST: readonly AccountFixture[] = [
  account("sena@ornek.test", { userId: USERS.user.id, session: "user", state: "ACTIVE", hasPassword: true }),
  account("ece@ornek.test", { userId: USERS.secondUser.id, session: "secondUser", state: "ACTIVE", hasPassword: true }),
  /** Application Manager: two-step sign-in is not part of step 20; the mock signs in directly. */
  account("deniz@ornek.test", { userId: USERS.manager.id, session: "manager", state: "ACTIVE", hasPassword: true }),
  account("dogrulanmamis@ornek.test", { session: "newUser", state: "UNVERIFIED", hasPassword: true }),
  account("silinecek@ornek.test", { session: "user", state: "PENDING_DELETION", hasPassword: true, deletionRequestedDaysAgo: 15 }),
  account("askida@ornek.test", { session: "user", state: "SUSPENDED", hasPassword: true, suspendedReason: "MULTI_ACCOUNT" }),
  account("google@ornek.test", { session: "user", state: "ACTIVE", hasPassword: false }),
];

/** Who the mock Google / Apple button signs in as (no provider window in Phase 1). */
export const PROVIDER_SESSION: UserKey = "user";

const MS_PER_DAY = 86_400_000;

/** Loads the fixture accounts into the mock "server" (`users` + `auth_identities`). */
export function seedAccounts(state: MockState, now: Date): void {
  const restoreDays = SYSTEM_SETTINGS["account.deletion_restore_days"];
  for (const fixture of ACCOUNT_LIST) {
    const requested = fixture.deletionRequestedDaysAgo === undefined ? null : new Date(now.getTime() - fixture.deletionRequestedDaysAgo * MS_PER_DAY);
    state.accounts.set(fixture.email, {
      email: fixture.email,
      userId: fixture.userId,
      session: fixture.session,
      state: fixture.state,
      password: fixture.hasPassword ? MOCK_PASSWORD : null,
      deletionRequestedAt: requested?.toISOString() ?? null,
      purgeAfter: requested ? new Date(requested.getTime() + restoreDays * MS_PER_DAY).toISOString() : null,
      suspendedReason: fixture.suspendedReason ?? null,
      // Existing accounts already had their gift; the unverified one gets it at verification.
      welcomeGiftGranted: fixture.state !== "UNVERIFIED",
    });
  }
}
