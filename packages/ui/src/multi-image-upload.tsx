"use client";

// MultiImageUpload + ImagePrivacyNote (product_design_pattern.md §5.19, §5.20):
// up to the configured number of images in one go; each file shows its own
// thumbnail and progress; a rejected file shows its reason on that file only
// and the others continue; files can be removed one by one. Accepted types and
// the size limit are stated near the control. The privacy note is always visible.
import { ImagePlus, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { type ChangeEvent, type ReactNode, useId, useRef } from "react";
import { cn, focusRing } from "./cn";
import { Icon } from "./icon";

export type UploadFileState = "uploading" | "processing" | "ready" | "rejected";

export interface UploadFileView {
  id: string;
  name: string;
  /** Local preview (object URL) of the picked file. */
  previewUrl: string | null;
  state: UploadFileState;
  /** Worded status under the name ("Yükleniyor", "Hazır", "Çok büyük · en çok 10 MB"). */
  status: string;
  /** 0–100 while uploading. */
  progress?: number;
}

export interface MultiImageUploadProps {
  /** Section heading ("Fotoğraflar"). */
  title: string;
  /** "3 / 5". */
  countLabel: string;
  /** Accepted types and size limit, worded. */
  limits: string;
  files: readonly UploadFileView[];
  /** "Fotoğraf ekle". */
  addLabel: string;
  /** Accessible name of a file's remove button, e.g. `${name} kaldır`. */
  removeLabel: (name: string) => string;
  /** Accessible name of the progress bar ("Yükleniyor"). */
  progressLabel: string;
  canAdd: boolean;
  accept: string;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  /** The privacy note under the list. */
  note: ReactNode;
  className?: string;
}

export function MultiImageUpload({ title, countLabel, limits, files, addLabel, removeLabel, progressLabel, canAdd, accept, onAdd, onRemove, note, className }: MultiImageUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (list.length) onAdd(list);
  };

  return (
    <section aria-labelledby={`${id}-title`} className={cn("flex flex-col gap-3 rounded-lg border border-border bg-surface p-4", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-body font-semibold text-text">
          {title}
        </h2>
        <span className="text-caption text-text-muted tabular-nums">{countLabel}</span>
      </div>
      <p className="text-caption text-text-muted">{limits}</p>
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3">
              {/* The name is read next to it; the thumbnail is decorative for assistive technology. */}
              <span aria-hidden="true" className="flex size-(--size-thumb-sm) shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-alt">
                {file.previewUrl ? <img src={file.previewUrl} alt={file.name} className="size-full object-cover" /> : <Icon icon={ImagePlus} className="text-text-muted" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-body-sm text-text">{file.name}</span>
                {file.state === "uploading" && (
                  <span
                    role="progressbar"
                    aria-label={progressLabel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={file.progress ?? 0}
                    className="h-(--size-progress-height) w-full overflow-hidden rounded-pill bg-surface-alt"
                  >
                    <span className="block h-full rounded-pill bg-primary" style={{ width: `${file.progress ?? 0}%` }} />
                  </span>
                )}
                <span className={cn("flex items-center gap-1 text-caption", file.state === "rejected" ? "text-danger" : "text-text-muted")}>
                  {file.state === "rejected" && <Icon icon={TriangleAlert} size="sm" />}
                  <span>{file.status}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                aria-label={removeLabel(file.name)}
                className={cn("flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill text-text-muted hover:bg-surface-alt", focusRing)}
              >
                <Icon icon={X} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept={accept} multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={picked} />
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => input.current?.click()}
        className={cn(
          "inline-flex min-h-(--size-touch-target-min) items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 text-body-sm font-semibold text-primary hover:bg-surface-alt",
          !canAdd && "cursor-not-allowed opacity-(--component-button-disabled-opacity)",
          focusRing,
        )}
      >
        <Icon icon={ImagePlus} />
        <span>{addLabel}</span>
      </button>
      {note}
    </section>
  );
}

/** Image privacy note (§5.20): info style with a shield icon; always visible. */
export function ImagePrivacyNote({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-info-subtle p-3 text-caption text-text">
      <Icon icon={ShieldCheck} size="sm" className="text-info" />
      <span>{children}</span>
    </p>
  );
}
