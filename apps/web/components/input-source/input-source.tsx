"use client";

// InputSourceHandler (pagedesign.md §5, canonical [DECIDED 2026-11-14]): photo and
// link intake for every SearchBox, in one place. It recognises a pasted store link
// (identified through `POST /identify`, our own purchase: platform, seller, price)
// and owns the page's one hidden file input (accepted types from
// `GET /uploads/policy`). Search and Add uploads the photos itself; every other page
// hands the photo or link over to Search and Add with that input.
import { type ApiError, type IdentifyResult, UploadPolicy } from "@firsatgeldi/contracts";
import type { Locale } from "@firsatgeldi/i18n";
import { useRouter } from "next/navigation";
import { type Ref, useEffect } from "react";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { searchAddHref } from "../../lib/handoff";

const URL_PATTERN = /^https?:\/\/\S+\.\S+/i;
/** A link pasted without "https://" ("amazon.com.tr/gp/aw/d/…"): a host name and a path, no spaces. */
const BARE_LINK_PATTERN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}\/\S*$/i;
/** Uploads for identification (database.md §14b `uploads.purpose`). */
export const IDENTIFY_PURPOSE = "IDENTIFY" as const;

export function isLink(text: string): boolean {
  const typed = text.trim();
  return URL_PATTERN.test(typed) || BARE_LINK_PATTERN.test(typed);
}

/** The link as sent to `POST /identify` (a URL): "https://" added when it was pasted without one. */
export function asLink(text: string): string {
  const typed = text.trim();
  return URL_PATTERN.test(typed) ? typed : `https://${typed}`;
}

/** The upload limits (types, size, count) — read before any upload, never typed into text. */
export function useUploadPolicy(): { policy: UploadPolicy | null; failed: boolean } {
  const query = useApiQuery("getUploadPolicy", { query: { purpose: IDENTIFY_PURPOSE } }, { staleTime: Number.POSITIVE_INFINITY });
  return { policy: query.data?.data ?? null, failed: query.isError };
}

/** A pasted link is identified as soon as it is recognised; anything else resets it. */
export function useLinkCheck(text: string, onError: (error: ApiError) => void): { link: boolean; pending: boolean; result: IdentifyResult | null } {
  const typed = text.trim();
  const link = isLink(typed);
  const check = useApiMutation("identify", { onError });
  const { mutate, reset } = check;
  useEffect(() => {
    if (link) mutate({ body: { link: asLink(typed) } });
    else reset();
  }, [link, typed, mutate, reset]);
  return { link, pending: check.isPending, result: check.data?.data ?? null };
}

/** The page's one file input; "Fotoğraf ekle" anywhere clicks it (`inputRef.current.click()`). */
export function PhotoInput({ inputRef, onFiles }: { inputRef: Ref<HTMLInputElement>; onFiles: (files: File[]) => void }) {
  const { policy } = useUploadPolicy();
  if (!policy) return null;
  return (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={policy.acceptedTypes.join(",")}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (files.length) onFiles(files);
      }}
    />
  );
}

// Photos chosen on another page wait here until Search and Add takes them (same tab, client-side navigation).
let handedFiles: File[] = [];

/** Search and Add: the photos handed over by another page (taken once). */
export function takeHandedFiles(): File[] {
  const files = handedFiles;
  handedFiles = [];
  return files;
}

/** Other pages: open Search and Add with a photo or a link the user gave here. */
export function useHandOverToSearchAdd(locale: Locale) {
  const router = useRouter();
  return {
    link(link: string) {
      router.push(`${searchAddHref(locale, { backToTracking: true })}&q=${encodeURIComponent(link.trim())}`);
    },
    files(files: File[]) {
      handedFiles = files;
      router.push(searchAddHref(locale, { backToTracking: true }));
    },
  };
}
