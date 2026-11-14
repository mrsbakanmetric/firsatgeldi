"use client";

// The photo area of the input step (design "1 Ara ve Ekle", Main: "Fotoğraflar
// 3 / 5"): MultiImageUpload + the image privacy note, limits from the upload
// policy. Each processing file is watched through useUploadStatus.
import type { Translator } from "@firsatgeldi/i18n";
import { ImagePrivacyNote, MultiImageUpload, type UploadFileView } from "@firsatgeldi/ui";
import { useEffect, useEffectEvent } from "react";
import { useUploadStatus } from "../../lib/api/uploads";
import { megabytes, typeList } from "./format";
import type { Photo, usePhotos } from "./use-photos";

type Photos = ReturnType<typeof usePhotos>;

/** Follows one upload until it is ready, rejected or the guest's polling runs out. */
function UploadStatusWatcher({ photo, onChange }: { photo: Photo; onChange: (patch: Partial<Photo>) => void }) {
  const status = useUploadStatus(photo.uploadId, photo.poll);
  const upload = status.state === "done" ? status.upload : null;
  // Report once per change of state (the hook returns a new object on every render).
  const key = `${status.state}:${upload?.status ?? ""}`;
  const report = useEffectEvent((current: typeof upload, state: typeof status.state) => {
    if (state === "timedOut") onChange({ state: "timedOut" });
    else if (state === "error") onChange({ state: "rejected", rejection: "OTHER" });
    else if (current?.status === "READY") onChange({ state: "ready", extracted: current.extracted });
    else if (current) onChange({ state: "rejected", rejection: current.rejectReason === "TYPE" ? "TYPE" : current.rejectReason === "SIZE" ? "SIZE" : "OTHER" });
  });
  useEffect(() => {
    report(upload, status.state);
    // Runs once per change of `key`; `upload` and `status.state` are part of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

function statusText(t: Translator, photos: Photos, photo: Photo): string {
  switch (photo.state) {
    case "uploading":
      return t("searchAdd.photos.uploading");
    case "processing":
      return t("searchAdd.photos.processing");
    case "ready":
      return t("searchAdd.photos.ready");
    case "timedOut":
      return t("uploadStatus.timeoutTitle");
    case "rejected":
      if (photo.rejection === "TYPE") return t("searchAdd.photos.rejectedType");
      if (photo.rejection === "SIZE" && photos.policy) return t("searchAdd.photos.rejectedSize", { size: megabytes(t, photos.policy) });
      return t("searchAdd.photos.rejectedOther");
  }
}

export function PhotoArea({ t, photos }: { t: Translator; photos: Photos }) {
  const { policy } = photos;
  if (!policy) return null;
  const counted = photos.photos.filter((photo) => photo.state !== "rejected").length;
  const files: UploadFileView[] = photos.photos.map((photo) => ({
    id: photo.localId,
    name: photo.name,
    previewUrl: photo.previewUrl,
    state: photo.state === "timedOut" ? "rejected" : photo.state,
    status: statusText(t, photos, photo),
    progress: photo.progress,
  }));
  const retention = policy.retention;
  return (
    <>
      {photos.photos
        .filter((photo) => photo.state === "processing" && photo.uploadId)
        .map((photo) => (
          <UploadStatusWatcher key={photo.localId} photo={photo} onChange={(patch) => photos.update(photo.localId, patch)} />
        ))}
      <MultiImageUpload
        title={t("searchAdd.photos.title")}
        countLabel={t("searchAdd.photos.count", { count: counted, max: policy.maxFiles })}
        limits={t("searchAdd.photos.limits", { types: typeList(policy), size: megabytes(t, policy) })}
        files={files}
        addLabel={t("searchAdd.search.addPhoto")}
        removeLabel={(name) => t("searchAdd.photos.remove", { name })}
        progressLabel={t("searchAdd.photos.uploading")}
        canAdd={counted < policy.maxFiles}
        accept={policy.acceptedTypes.join(",")}
        onAdd={photos.add}
        onRemove={photos.remove}
        note={retention && retention.unit === "HOURS" ? <ImagePrivacyNote>{t("searchAdd.photos.privacyHours", { count: retention.amount })}</ImagePrivacyNote> : null}
      />
    </>
  );
}
