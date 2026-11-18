// Development only: starts the in-browser mock API. Loaded by a dynamic import
// behind the mock API switch in lib/api/ready.ts, which a production build folds
// to `false`, so neither this file nor @firsatgeldi/mocks reaches the production
// bundle (checked by scripts/check-no-mock.mjs after `next build`).
import { DEFAULT_LOCALE, isLocale, localizedPath } from "@firsatgeldi/i18n";
import { type MockWorkerOptions, startMockWorker } from "@firsatgeldi/mocks/browser";

type MockMail = Parameters<NonNullable<MockWorkerOptions["onMail"]>>[0];

/**
 * No e-mail is sent in Phase 1: the mock sign-in's verification and reset links are
 * printed in the browser console, in the page's language, to open in the same tab.
 */
function printMockMail(mail: MockMail): void {
  const lang = document.documentElement.lang;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const route = mail.purpose === "VERIFY_EMAIL" ? "/dogrula" : "/sifre-sifirla";
  console.info(`[mock e-mail → ${mail.emailMasked}] ${globalThis.location.origin}${localizedPath(route, locale)}?token=${mail.token}`);
}

export function startDevMockApi() {
  return startMockWorker({ onMail: printMockMail });
}
