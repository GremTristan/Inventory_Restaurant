// Browser-only image utilities (Canvas, createImageBitmap) — only ever
// imported by "use client" components (components/avatar-widget.tsx,
// components/daily-sales-form.tsx). No server-only guard exists for
// "client-only" the way lib/*-store.ts files guard with "server-only", so
// this comment is the only safeguard: never import this from a Server
// Component or Server Action.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

// Downscales + re-encodes a photo as JPEG entirely client-side before it
// ever reaches the network. A modern phone photo can be 15-25MB
// uncompressed; this routinely brings that under ~500KB, both faster to
// upload and faster for the vision model to process. Falls back to the
// original file if anything about the decode pipeline fails (e.g. an
// unsupported format slipping past `accept`).
export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
