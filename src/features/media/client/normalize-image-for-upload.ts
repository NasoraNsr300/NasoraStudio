import { DISPLAY_IMAGE_MAX_EDGE, inspectImageUpload } from "@/features/media/domain/image-upload";

function webpName(name: string) {
  return `${name.replace(/\.[^.]+$/, "") || "image"}.webp`;
}

async function canvasBlob(bitmap: ImageBitmap, width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image_conversion_failed");
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ quality: 0.86, type: "image/webp" });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("image_conversion_failed");
  context.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("image_conversion_failed")),
    "image/webp",
    0.86,
  ));
}

export async function normalizeImageForUpload(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, DISPLAY_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (file.type === "image/webp" && scale === 1) {
      await inspectImageUpload(file);
      return { contentType: "image/webp" as const, file, height, width };
    }
    const blob = await canvasBlob(bitmap, width, height);
    const normalized = new File([blob], webpName(file.name), { lastModified: file.lastModified, type: "image/webp" });
    await inspectImageUpload(normalized);
    return { contentType: "image/webp" as const, file: normalized, height, width };
  } finally {
    bitmap.close();
  }
}
