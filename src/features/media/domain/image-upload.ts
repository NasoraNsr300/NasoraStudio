export const DISPLAY_IMAGE_LIMIT_BYTES = 5 * 1024 * 1024;
export const DISPLAY_IMAGE_MAX_EDGE = 4096;

export type DisplayImageContentType = "image/jpeg" | "image/png" | "image/webp";

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function endsWith(bytes: Uint8Array, signature: readonly number[]) {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[bytes.length - signature.length + index] === byte);
}

export function detectImageContentType(bytes: Uint8Array): DisplayImageContentType {
  const pngEnd = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82] as const;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) && endsWith(bytes, pngEnd)) return "image/png";
  if (bytes.length >= 5 && startsWith(bytes, [0xff, 0xd8, 0xff]) && endsWith(bytes, [0xff, 0xd9])) return "image/jpeg";
  if (bytes.length >= 12 && startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) {
    const declaredSize = new DataView(bytes.buffer, bytes.byteOffset + 4, 4).getUint32(0, true) + 8;
    if (declaredSize === bytes.length) return "image/webp";
  }
  throw new Error("invalid_image");
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function inspectPng(bytes: Uint8Array) {
  if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { contentType: "image/png" as const, height: view.getUint32(20), width: view.getUint32(16) };
}

function inspectWebp(bytes: Uint8Array) {
  if (bytes.length < 25 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    const width = 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16);
    const height = 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16);
    return { contentType: "image/webp" as const, height, width };
  }
  if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    const width = (bytes[26]! | (bytes[27]! << 8)) & 0x3fff;
    const height = (bytes[28]! | (bytes[29]! << 8)) & 0x3fff;
    return { contentType: "image/webp" as const, height, width };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(21, true);
    const width = 1 + (bits & 0x3fff);
    const height = 1 + ((bits >> 14) & 0x3fff);
    return { contentType: "image/webp" as const, height, width };
  }
  return null;
}

function inspectJpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1]!;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
    if (length < 2 || offset + length + 2 > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        contentType: "image/jpeg" as const,
        height: (bytes[offset + 5]! << 8) + bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) + bytes[offset + 8]!,
      };
    }
    offset += length + 2;
  }
  return null;
}

export async function inspectImageUpload(file: Pick<File, "arrayBuffer" | "size" | "type">) {
  if (file.size < 1 || file.size > DISPLAY_IMAGE_LIMIT_BYTES) throw new Error("invalid_image");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectPng(bytes) ?? inspectJpeg(bytes) ?? inspectWebp(bytes);
  if (!inspected || inspected.contentType !== file.type
    || inspected.width < 1 || inspected.height < 1
    || inspected.width > 20_000 || inspected.height > 20_000) {
    throw new Error("invalid_image");
  }
  return { ...inspected, sizeBytes: bytes.byteLength };
}
