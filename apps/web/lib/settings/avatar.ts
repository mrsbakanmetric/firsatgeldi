// Profile photo (design "9 Ayarlar" v2.1, Forms 4; product_design_pattern.md §5.38 AvatarUpload):
// the picked image is cropped to a square around its centre at the chosen zoom and re-encoded
// on a canvas — which also drops its location and other metadata (§5.20) — then uploaded with
// purpose AVATAR (presign → PUT → complete) and saved with `PATCH /me`.
import type { ApiClient } from "@firsatgeldi/contracts";

/** Pixel size of the saved square photo. */
const OUTPUT_PIXELS = 512;
const JPEG_QUALITY = 0.9;
const POLL_MS = 400;
const POLL_TRIES = 25;

/** Crop zoom range of the slider. */
export const ZOOM = { min: 1, max: 3, step: 0.1 } as const;

/** A square JPEG of the centre of `file`, `zoom` times closer. */
export async function cropToSquare(file: Blob, zoom: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height) / zoom;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_PIXELS;
  canvas.height = OUTPUT_PIXELS;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, OUTPUT_PIXELS, OUTPUT_PIXELS);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", JPEG_QUALITY));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Uploads the cropped photo and returns its upload id once it is READY. */
export async function uploadAvatar(client: ApiClient, photo: Blob): Promise<string> {
  const presign = await client.call("presignUploads", { body: { purpose: "AVATAR", files: [{ mime: "image/jpeg", bytes: photo.size }] } });
  const target = presign.data.uploads[0];
  if (!target) throw new Error("no upload slot");
  const put = await fetch(target.uploadUrl, { method: "PUT", headers: target.headers, body: photo });
  if (!put.ok) throw new Error("upload failed");
  await client.call("completeUploads", { body: { batchId: presign.data.batchId } });
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    const { data } = await client.call("getUpload", { params: { id: target.uploadId } });
    if (data.status === "READY") return target.uploadId;
    if (data.status === "REJECTED" || data.status === "EXPIRED" || data.status === "DELETED") throw new Error("rejected");
    await wait(POLL_MS);
  }
  throw new Error("timed out");
}
