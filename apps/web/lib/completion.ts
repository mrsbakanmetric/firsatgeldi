// Inline completion for the shared SearchBox (pagedesign.md §8.2 v4, §8.4 v4): the first
// name that starts with the typed text completes it after the caret; Tab or → accepts
// with that name's own spelling. Turkish folding with ı = i, so "insta" matches "Insta360".

/** Lower case in Turkish with ı = i; same length as the input. */
export function foldText(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/ı/g, "i");
}

/** The first name that starts with `typed` and is longer than it, or null. */
export function completionFor(typed: string, names: readonly string[]): string | null {
  if (!typed) return null;
  const folded = foldText(typed);
  return names.find((name) => name.length > typed.length && foldText(name).startsWith(folded)) ?? null;
}

/** Tab or → at the end of the text accepts the completion. */
export function acceptsCompletion(event: { key: string; shiftKey: boolean; currentTarget: { selectionStart: number | null; selectionEnd: number | null } }, length: number): boolean {
  const atEnd = event.currentTarget.selectionStart === length && event.currentTarget.selectionEnd === length;
  return atEnd && !event.shiftKey && (event.key === "Tab" || event.key === "ArrowRight");
}
