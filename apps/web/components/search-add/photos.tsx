"use client";

// The photo area of the input step (design "1 Ara ve Ekle"): MultiImageUpload +
// the image privacy note, limits from the upload policy. Desktop (design v2):
// inline under the search box; phone: the "Fotoğraflar 3 / 5" panel. Each
// processing file is watched once through useUploadStatus (PhotoWatchers).
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

/** Follows every processing upload; rendered once per page, whatever the layout. */
export function PhotoWatchers({ photos }: { photos: Photos }) {
  return photos.photos
    .filter((photo) => photo.state === "processing" && photo.uploadId)
    .map((photo) => <UploadStatusWatcher key={photo.localId} photo={photo} onChange={(patch) => photos.update(photo.localId, patch)} />);
}

export function PhotoArea({ t, photos, layout }: { t: Translator; photos: Photos; layout: "panel" | "inline" }) {
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
  const privacy = retention && retention.unit === "HOURS" ? t("searchAdd.photos.privacyHours", { count: retention.amount }) : null;
  const common = {
    title: t("searchAdd.photos.title"),
    files,
    removeLabel: (name: string) => t("searchAdd.photos.remove", { name }),
    progressLabel: t("searchAdd.photos.uploading"),
    onRemove: photos.remove,
  };
  if (layout === "inline") {
    return (
      <MultiImageUpload
        {...common}
        layout="inline"
        limits={t("searchAdd.photos.limitsLine", { count: counted, max: policy.maxFiles, types: typeList(policy), size: megabytes(t, policy) })}
        note={privacy && <ImagePrivacyNote variant="line">{privacy}</ImagePrivacyNote>}
      />
    );
  }
  return (
    <MultiImageUpload
      {...common}
      countLabel={t("searchAdd.photos.count", { count: counted, max: policy.maxFiles })}
      limits={t("searchAdd.photos.limits", { types: typeList(policy), size: megabytes(t, policy) })}
      addLabel={t("searchAdd.search.addPhoto")}
      canAdd={counted < policy.maxFiles}
      accept={policy.acceptedTypes.join(",")}
      onAdd={photos.add}
      note={privacy && <ImagePrivacyNote>{privacy}</ImagePrivacyNote>}
    />
  );
}
