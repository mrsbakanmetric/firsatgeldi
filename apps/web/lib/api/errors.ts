// API errors → text from the i18n catalogue (architecture.md §15.2: the
// client translates `messageKey`; the code is never shown).
import { ApiError, CONTRACT_ERROR_MESSAGE_KEY } from "@firsatgeldi/contracts";
import type { TranslationKey, Translator } from "@firsatgeldi/i18n";

export function errorMessage(t: Translator, error: unknown): string {
  const key = error instanceof ApiError ? error.body.messageKey : CONTRACT_ERROR_MESSAGE_KEY;
  try {
    return t(key as TranslationKey);
  } catch {
    // A key this client does not know yet (newer server): the general message.
    return t(CONTRACT_ERROR_MESSAGE_KEY as TranslationKey);
  }
}
