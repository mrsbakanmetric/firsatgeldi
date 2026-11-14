"use client";

// MultiImageUpload + ImagePrivacyNote (product_design_pattern.md §5.19, §5.20):
// up to the configured number of images in one go; each file shows its own
// thumbnail and progress; a rejected file shows its reason on that file only
// and the others continue; files can be removed one by one. Accepted types and
// the size limit are stated near the control. The privacy note is always visible.
// "panel": a card with its own "Fotoğraf ekle" control. "inline" (Search and Add
// design v2, pagedesign.md §8.2): under the search box, files as compact chips,
// then one limits line and the one-line privacy note; files are added elsewhere.
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

interface CommonProps {
  /** Section heading ("Fotoğraflar"); the accessible name of the inline section. */
  title: string;
  /** Panel: accepted types and size limit. Inline: the whole limits line, count included. */
  limits: string;
  files: readonly UploadFileView[];
  /** Accessible name of a file's remove button, e.g. `${name} kaldır`. */
  removeLabel: (name: string) => string;
  /** Accessible name of the progress bar ("Yükleniyor"). */
  progressLabel: string;
  onRemove: (id: string) => void;
  /** The privacy note under the list. */
  note: ReactNode;
  className?: string;
}

interface PanelProps extends CommonProps {
  layout?: "panel";
  /** "3 / 5". */
  countLabel: string;
  /** "Fotoğraf ekle". */
  addLabel: string;
  canAdd: boolean;
  accept: string;
  onAdd: (files: File[]) => void;
}

interface InlineProps extends CommonProps {
  layout: "inline";
}

export type MultiImageUploadProps = PanelProps | InlineProps;

export function MultiImageUpload(props: MultiImageUploadProps) {
  return props.layout === "inline" ? <InlineUpload {...props} /> : <PanelUpload {...props} />;
}

function PanelUpload({ title, countLabel, limits, files, addLabel, removeLabel, progressLabel, canAdd, accept, onAdd, onRemove, note, className }: PanelProps) {
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
              <FileThumb file={file} className="rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-body-sm text-text">{file.name}</span>
                {file.state === "uploading" && <Progress label={progressLabel} value={file.progress ?? 0} />}
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

function InlineUpload({ title, limits, files, removeLabel, progressLabel, onRemove, note, className }: InlineProps) {
  return (
    <section aria-label={title} className={cn("flex flex-col gap-3", className)}>
      {files.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {files.map((file) => {
            const rejected = file.state === "rejected";
            return (
              <li key={file.id} className={cn("flex min-w-0 items-center gap-2 rounded-md border py-1 pl-1", rejected ? "border-danger bg-danger-subtle" : "border-border bg-surface")}>
                <FileThumb file={file} className="rounded-sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-caption font-semibold text-text">{file.name}</span>
                  {file.state === "uploading" && <Progress label={progressLabel} value={file.progress ?? 0} />}
                  <span className={cn("text-caption", file.state !== "uploading" && "font-semibold", file.state === "ready" ? "text-savings" : rejected ? "text-danger" : "text-text-muted")}>{file.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  aria-label={removeLabel(file.name)}
                  className={cn("flex size-(--size-touch-target-min) shrink-0 items-center justify-center rounded-pill text-text-muted hover:bg-surface-alt", focusRing)}
                >
                  <Icon icon={X} size="sm" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-text-muted">{limits}</p>
      {note}
    </section>
  );
}

/**
 * A file's thumbnail. A rejected file never shows its preview (a video or broken
 * file would render as a broken image): a dashed danger frame with a warning icon.
 * The name is read next to it, so the thumbnail is decorative for assistive technology.
 */
function FileThumb({ file, className }: { file: UploadFileView; className: string }) {
  const rejected = file.state === "rejected";
  return (
    <span
      aria-hidden="true"
      data-testid="file-thumb"
      className={cn(
        "flex size-(--size-thumb-sm) shrink-0 items-center justify-center overflow-hidden",
        rejected ? "border-(length:--border-width-strong) border-dashed border-danger" : "bg-surface-alt",
        className,
      )}
    >
      {rejected ? (
        <Icon icon={TriangleAlert} size="sm" className="text-danger" />
      ) : file.previewUrl ? (
        <img src={file.previewUrl} alt={file.name} className="size-full object-cover" />
      ) : (
        <Icon icon={ImagePlus} className="text-text-muted" />
      )}
    </span>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-(--size-progress-height) w-full overflow-hidden rounded-pill bg-surface-alt">
      <span className="block h-full rounded-pill bg-primary" style={{ width: `${value}%` }} />
    </span>
  );
}

/** Image privacy note (§5.20): always visible. "box": info box; "line": one line with the shield icon (inline upload). */
export function ImagePrivacyNote({ children, variant = "box" }: { children: string; variant?: "box" | "line" }) {
  return (
    <p className={cn("flex items-start gap-2 text-caption text-text", variant === "box" && "rounded-md bg-info-subtle p-3")}>
      <Icon icon={ShieldCheck} size="sm" className="text-info" />
      <span>{children}</span>
    </p>
  );
}
