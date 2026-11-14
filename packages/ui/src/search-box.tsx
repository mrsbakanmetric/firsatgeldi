"use client";

// SearchBox (pagedesign.md §5, canonical [DECIDED 2026-11-14]; components.search-box):
// one look everywhere — 48 px box, camera icon, × while there is text, compact
// "Ara". Only the search handler differs per page (catalogue search on Search and
// Add, filtering the page's own list elsewhere). An optional overlay under the box
// (suggestions) closes on a press outside, Esc, the camera and "Ara"
// (components.popover-dismiss, design v4); it never pushes the page.
import { Camera } from "lucide-react";
import { forwardRef, type KeyboardEvent, type ReactNode, useMemo, useRef } from "react";
import { Button } from "./button";
import { useEscape, useOutsidePress } from "./overlay";
import { SearchField, type SearchFieldProps } from "./search-field";

export interface SearchBoxProps extends Omit<SearchFieldProps, "size" | "trailing" | "onChange" | "value" | "hideLabel" | "onClear" | "clearLabel"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Enter (when the page's own key handling does not take it) and "Ara". */
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  /** The camera icon: the page hands photos to its input source. */
  addPhotoLabel: string;
  onAddPhoto: () => void;
  clearLabel: string;
  /** Content of the overlay under the box (e.g. suggestions). */
  overlay?: ReactNode;
  overlayOpen?: boolean;
  onOverlayClose?: () => void;
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
  { value, onValueChange, onSubmit, submitLabel, submitDisabled = false, submitting = false, addPhotoLabel, onAddPhoto, clearLabel, overlay, overlayOpen = false, onOverlayClose, onKeyDown, ...field },
  ref,
) {
  const frame = useRef<HTMLDivElement>(null);
  const inside = useMemo(() => [frame], []);
  const close = () => onOverlayClose?.();
  useOutsidePress(inside, overlayOpen, close);
  useEscape(overlayOpen, close);

  const submit = () => {
    close();
    onSubmit();
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && event.key === "Enter") {
      event.preventDefault();
      if (!submitDisabled) submit();
    }
  };

  return (
    <div ref={frame} className="relative flex flex-col">
      <SearchField
        ref={ref}
        hideLabel
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={keyDown}
        clearLabel={clearLabel}
        onClear={() => onValueChange("")}
        trailing={
          <>
            <Button variant="ghost" size="compact" iconOnly icon={Camera} label={addPhotoLabel} onClick={() => (close(), onAddPhoto())} />
            <Button size="compact" onClick={submit} disabled={submitDisabled} loading={submitting}>
              {submitLabel}
            </Button>
          </>
        }
        {...field}
      />
      {overlayOpen && overlay && (
        <div className="absolute inset-x-0 top-full z-(--z-index-popover) mt-2 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-md">{overlay}</div>
      )}
    </div>
  );
});
