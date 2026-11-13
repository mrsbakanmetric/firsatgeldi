// Deterministic identifiers for fixtures, so tests and screenshots are stable.

/** 32-bit FNV-1a hash of a string with a seed. */
function fnv1a(text: string, seed: number): number {
  let hash = 0x811c9dc5 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hex(text: string, length: number): string {
  let out = "";
  for (let seed = 0; out.length < length; seed += 1) out += fnv1a(text, seed).toString(16).padStart(8, "0");
  return out.slice(0, length);
}

/** A stable RFC 9562 version-4-shaped UUID derived from a name. */
export function uuidFor(name: string): string {
  const h = hex(name, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** A stable 64-hex content address standing in for an image SHA-256. */
export function sha256For(name: string): string {
  return hex(`image:${name}`, 64);
}

/** base64url text of a stable hash (opaque offer refs, architecture.md §6.2). */
export function opaqueRef(parts: readonly string[]): string {
  const bytes = hex(parts.join("\u0000"), 48);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 2) binary += String.fromCharCode(Number.parseInt(bytes.slice(index, index + 2), 16));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A fresh UUID for rows created at run time (tracked items, uploads …). */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}
