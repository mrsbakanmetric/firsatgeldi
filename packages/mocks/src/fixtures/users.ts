// Mock users. Personal data only in masked form (implementation_plan.md §5
// rule 5; architecture.md §15.2): no real person's data, no full e-mail/phone.
import type { ApiLocale, RoleCode } from "@firsatgeldi/contracts";
import { uuidFor } from "../ids";
import { type Localized, text } from "./text";

export interface UserFixture {
  readonly key: string;
  readonly id: string;
  readonly displayName: string | null;
  readonly username: string | null;
  readonly emailMasked: string;
  readonly phoneMasked: string | null;
  /** Full phone, a made-up number: only `GET /me/pii` returns it, after re-authentication. */
  readonly phone: string | null;
  /** `users.locale` (database.md §3). */
  readonly locale: ApiLocale;
  readonly roles: readonly RoleCode[];
  readonly plan: "FREE" | "PREMIUM";
  readonly tokenBalance: number;
  /** Own searches ("Son aramaların"), newest first; minutes ago. */
  readonly searchHistory: readonly { query: Localized; minutesAgo: number }[];
}

function user(key: string, values: Omit<UserFixture, "key" | "id">): UserFixture {
  return { key, id: uuidFor(`user:${key}`), ...values };
}

export const USERS = {
  user: user("user", {
    displayName: "Sena B.", username: "sena", emailMasked: "se***@e***.com", phoneMasked: "+90 5** *** ** 41", phone: "+90 555 000 00 41", locale: "tr",
    roles: ["USER"], plan: "FREE", tokenBalance: 3,
    searchHistory: [
      { query: text("Dyson V15 Detect", "Dyson V15 Detect"), minutesAgo: 90 },
      { query: text("AirPods Pro 2", "AirPods Pro 2"), minutesAgo: 60 * 26 },
      { query: text("Kışlık mont", "Winter coat"), minutesAgo: 60 * 24 * 4 },
    ],
  }),
  /** A second signed-in user: proves refs and reveals do not cross users. */
  secondUser: user("second-user", {
    displayName: "Ece K.", username: "ece", emailMasked: "ec***@e***.com", phoneMasked: null, phone: null, locale: "en",
    roles: ["USER"], plan: "FREE", tokenBalance: 0, searchHistory: [],
  }),
  /** A just-created account (sign-up → verified link): no name yet, nothing tracked, the welcome gift only. */
  newUser: user("new-user", {
    displayName: null, username: null, emailMasked: "y***@o***.test", phoneMasked: null, phone: null, locale: "tr",
    roles: ["USER"], plan: "FREE", tokenBalance: 3, searchHistory: [],
  }),
  manager: user("manager", {
    displayName: "Deniz Y.", username: "deniz", emailMasked: "de***@f***.com", phoneMasked: "+90 5** *** ** 07", phone: "+90 555 000 00 07", locale: "tr",
    roles: ["APP_MANAGER"], plan: "PREMIUM", tokenBalance: 0, searchHistory: [],
  }),
} as const satisfies Record<string, UserFixture>;

export type UserKey = keyof typeof USERS;

/** Order screenshot read result (design case B): product, seller, price, date only. */
export const ORDER_SCREENSHOT_EXTRACTION = {
  productText: text("Insta360 Ace Pro 2 · Flash Print", "Insta360 Ace Pro 2 · Flash Print"),
  seller: "kameraDunyasi",
  orderedDaysAgo: 6,
} as const;
