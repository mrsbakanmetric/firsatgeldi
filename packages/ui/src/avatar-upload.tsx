"use client";

// AvatarUpload (product_design_pattern.md §5.38 [DECIDED 2026-11-18]): "Fotoğraf yükle" /
// "Kaldır" beside the avatar, the accepted types under them. The upload opens a Dialog with
// `AvatarCrop`: the image under a circular crop, a zoom slider; "Başka fotoğraf" / "Kaydet".
import { useId, useRef } from "react";
import { Avatar } from "./avatar";
import { Button } from "./button";

export interface AvatarUploadProps {
  initials: string;
  src: string | null;
  uploadLabel: string;
  removeLabel: string;
  /** "JPEG, PNG ya da WebP · en çok 5 MB · konum bilgisi silinir". */
  hint: string;
  /** Accepted MIME types (from the upload policy). */
  accept: readonly string[];
  onPick: (file: File) => void;
  onRemove: () => void;
  removing?: boolean;
}

export function AvatarUpload({ initials, src, uploadLabel, removeLabel, hint, accept, onPick, onRemove, removing = false }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  return (
    <div className="flex items-center gap-4">
      <Avatar initials={initials} src={src} size="lg" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="compact" onClick={() => input.current?.click()} aria-describedby={hintId}>
            {uploadLabel}
          </Button>
          {src && (
            <Button variant="ghost" size="compact" onClick={onRemove} loading={removing}>
              {removeLabel}
            </Button>
          )}
        </div>
        <span id={hintId} className="text-caption text-text-muted">
          {hint}
        </span>
        <input
          ref={input}
          type="file"
          accept={accept.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/** Decorative image: the dialog title names it. */
const DECORATIVE = "";

export interface AvatarCropProps {
  /** Object URL of the picked image. */
  src: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  zoomLabel: string;
  minZoom: number;
  maxZoom: number;
  step: number;
}

/** The picked image centred under a circular window; the slider scales it. Decorative image: the dialog title names it. */
export function AvatarCrop({ src, zoom, onZoomChange, zoomLabel, minZoom, maxZoom, step }: AvatarCropProps) {
  const id = useId();
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-(--size-thumb-lg) overflow-hidden rounded-pill bg-surface-alt ring-(length:--border-width-strong) ring-primary">
        <img src={src} alt={DECORATIVE} className="absolute inset-0 size-full object-cover" style={{ transform: `scale(${zoom})` }} />
      </div>
      <label htmlFor={id} className="flex w-full flex-col gap-2 text-body-sm font-semibold text-text">
        {zoomLabel}
        <input id={id} type="range" min={minZoom} max={maxZoom} step={step} value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} className="w-full accent-primary" />
      </label>
    </div>
  );
}
