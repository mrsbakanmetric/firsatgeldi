"use client";

// Photos of Search and Add (architecture.md §11a; product_design_pattern.md §5.19):
// limits from GET /uploads/policy (settings, never typed into text), presign →
// direct upload with progress → complete; each file then follows its own status
// (live updates for a signed-in user, polling for a guest — UploadStatusWatcher).
// A rejected file shows its reason; the others continue. Always purpose IDENTIFY:
// the server recognises an order screen itself (user decision 2026-11-14).
import { type ApiClient, type PresignRequest, type UploadPolicy, type UploadPolling, type UploadView } from "@firsatgeldi/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiQuery } from "../../lib/api/hooks";
import { useApiClient } from "../../lib/api/provider";

const PURPOSE = "IDENTIFY" as const;
const PERCENT = 100;

export type PhotoState = "uploading" | "processing" | "ready" | "rejected" | "timedOut";
export type PhotoRejection = "TYPE" | "SIZE" | "OTHER";

export interface Photo {
  readonly localId: string;
  readonly name: string;
  readonly previewUrl: string | null;
  readonly state: PhotoState;
  readonly progress: number;
  readonly rejection: PhotoRejection | null;
  readonly uploadId: string | null;
  readonly poll: UploadPolling | null;
  /** Fields read from an order screen (product, seller, price, date only). */
  readonly extracted: UploadView["extracted"];
}

function previewOf(file: File): string | null {
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

/** PUT to the presigned URL with progress (fetch has no upload progress). */
function putFile(url: string, headers: Record<string, string>, file: File, onProgress: (percent: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * PERCENT));
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.send(file);
  });
}

/** Types were checked against the policy before this call. */
async function uploadBatch(client: ApiClient, files: readonly { localId: string; file: File }[], update: (localId: string, patch: Partial<Photo>) => void) {
  try {
    const presign = await client.call("presignUploads", { body: { purpose: PURPOSE, files: files.map(({ file }) => ({ mime: file.type as PresignRequest["files"][number]["mime"], bytes: file.size })) } });
    const results = await Promise.all(
      files.map(async ({ localId, file }, index) => {
        const target = presign.data.uploads[index];
        if (!target) return false;
        update(localId, { uploadId: target.uploadId });
        const ok = await putFile(target.uploadUrl, target.headers, file, (progress) => update(localId, { progress }));
        if (!ok) update(localId, { state: "rejected", rejection: "OTHER" });
        return ok;
      }),
    );
    if (!results.some(Boolean)) return;
    const complete = await client.call("completeUploads", { body: { batchId: presign.data.batchId } });
    for (const [index, { localId }] of files.entries()) {
      if (results[index]) update(localId, { state: "processing", progress: PERCENT, poll: complete.data.poll });
    }
  } catch {
    for (const { localId } of files) update(localId, { state: "rejected", rejection: "OTHER" });
  }
}

export function usePhotos() {
  const client = useApiClient();
  const policyQuery = useApiQuery("getUploadPolicy", { query: { purpose: PURPOSE } }, { staleTime: Number.POSITIVE_INFINITY });
  const policy: UploadPolicy | null = policyQuery.data?.data ?? null;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const counter = useRef(0);
  const previews = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL?.(url);
    },
    [],
  );

  const update = useCallback((localId: string, patch: Partial<Photo>) => {
    setPhotos((list) => list.map((photo) => (photo.localId === localId ? { ...photo, ...patch } : photo)));
  }, []);

  const add = useCallback(
    (files: File[]) => {
      if (!policy) return;
      const room = Math.max(0, policy.maxFiles - photos.filter((photo) => photo.state !== "rejected").length);
      const accepted: { localId: string; file: File }[] = [];
      const added: Photo[] = files.slice(0, room).map((file) => {
        counter.current += 1;
        const localId = `photo-${counter.current}`;
        const previewUrl = previewOf(file);
        if (previewUrl) previews.current.push(previewUrl);
        const rejection: PhotoRejection | null = !(policy.acceptedTypes as readonly string[]).includes(file.type) ? "TYPE" : file.size > policy.maxBytes ? "SIZE" : null;
        if (!rejection) accepted.push({ localId, file });
        return { localId, name: file.name, previewUrl, state: rejection ? "rejected" : "uploading", progress: 0, rejection, uploadId: null, poll: null, extracted: null };
      });
      setPhotos((list) => [...list, ...added]);
      if (accepted.length) void uploadBatch(client, accepted, update);
    },
    [client, photos, policy, update],
  );

  const remove = useCallback((localId: string) => setPhotos((list) => list.filter((photo) => photo.localId !== localId)), []);
  const reset = useCallback(() => setPhotos([]), []);

  const readyIds = photos.filter((photo) => photo.state === "ready" && photo.uploadId).map((photo) => photo.uploadId as string);
  const busy = photos.some((photo) => photo.state === "uploading" || photo.state === "processing");
  const extracted = photos.find((photo) => photo.extracted)?.extracted ?? null;
  const timedOut = photos.some((photo) => photo.state === "timedOut");

  return { policy, policyFailed: policyQuery.isError, photos, add, remove, reset, update, readyIds, busy, extracted, timedOut };
}
