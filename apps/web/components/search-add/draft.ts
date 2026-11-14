// Guest hand-over to sign-in (modules.md Search and Add, design case F): the
// marked product and what was typed are kept in this browser tab and restored
// when the user comes back signed in. Session storage only (cleared with the
// tab); storage can be blocked, so every access is guarded.
import type { IdentifyResult } from "@firsatgeldi/contracts";

const DRAFT_KEY = "fg-search-add-draft";
/** URL parameter that asks the page to restore the draft after sign-in. */
export const RESUME_PARAM = "devam";

export interface SearchDraft {
  readonly query: string;
  readonly identifyRequestId: string | null;
  readonly candidate: IdentifyResult["candidates"][number];
  readonly pricePaid: string;
  readonly orderedOn: string;
}

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: SearchDraft): void {
  try {
    storage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Blocked storage: the user signs in and searches again.
  }
}

export function readDraft(): SearchDraft | null {
  try {
    const raw = storage()?.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SearchDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    storage()?.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
