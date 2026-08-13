import "server-only";

import { AwsV4Signer } from "aws4fetch";

import { detectSlipContentType } from "@/features/payments/domain/payment";

type Environment = Record<string, string | undefined>;
type Method = "DELETE" | "GET" | "HEAD" | "PUT";

function required(environment: Environment, name: string) { const value = environment[name]?.trim(); if (!value) throw new Error("r2_assets_not_configured"); return value; }
function encode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`); }

export const PRIVATE_ASSET_LIMITS = {
  deliveryBytes: 25 * 1024 * 1024,
  deliveryTypes: ["application/octet-stream", "application/pdf", "application/zip", "image/jpeg", "image/png", "image/webp"] as const,
  imageBytes: 5 * 1024 * 1024,
};

export function createR2PrivateAssetsStorage(environment: Environment = process.env, fetcher: typeof fetch = fetch, now: () => Date = () => new Date()) {
  const accountId = required(environment, "R2_ACCOUNT_ID");
  const accessKeyId = required(environment, "R2_ACCESS_KEY_ID");
  const secretAccessKey = required(environment, "R2_SECRET_ACCESS_KEY");
  const bucket = required(environment, "R2_PRIVATE_ASSETS_BUCKET");
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  async function signedUrl(method: Method, objectKey: string, contentType?: string, expiresIn = 300) {
    if (!/^(catalog-covers|deliveries|document-covers|member-avatars|message-images|portfolio|progress-images)\//.test(objectKey) || expiresIn < 1 || expiresIn > 900) throw new Error("invalid_r2_request");
    const path = `/${encode(bucket)}/${objectKey.split("/").map(encode).join("/")}`;
    const signer = new AwsV4Signer({
      accessKeyId,
      datetime: now().toISOString().replace(/[:-]|\.\d{3}/g, ""),
      headers: contentType ? { "content-type": contentType } : undefined,
      method,
      region: "auto",
      secretAccessKey,
      service: "s3",
      signQuery: true,
      url: `${endpoint}${path}?X-Amz-Expires=${expiresIn}`,
    });
    return (await signer.sign()).url.toString();
  }
  return {
    createDownloadUrl(objectKey: string) { return signedUrl("GET", objectKey, undefined, 180); },
    async deleteObject(objectKey: string) { const response = await fetcher(await signedUrl("DELETE", objectKey, undefined, 60), { method: "DELETE" }); if (!response.ok && response.status !== 404) throw new Error("r2_delete_failed"); },
    async getObject(objectKey: string) {
      const response = await fetcher(await signedUrl("GET", objectKey, undefined, 60));
      if (response.status === 404) return null;
      if (!response.ok || !response.body) throw new Error("r2_download_failed");
      const sizeBytes = Number(response.headers.get("content-length"));
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
      const etag = response.headers.get("etag")?.replace(/^"|"$/g, "").trim() ?? "";
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || !contentType || !etag) throw new Error("invalid_r2_object_metadata");
      return { body: response.body, contentType, etag, sizeBytes };
    },
    async headObject(objectKey: string) {
      const response = await fetcher(await signedUrl("HEAD", objectKey, undefined, 60), { method: "HEAD" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("r2_head_failed");
      const sizeBytes = Number(response.headers.get("content-length"));
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
      const etag = response.headers.get("etag")?.replace(/^"|"$/g, "").trim() ?? "";
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || !contentType || !etag) throw new Error("invalid_r2_object_metadata");
      return { contentType, etag, sizeBytes };
    },
    async putDelivery(objectKey: string, bytes: Uint8Array, contentType: string) {
      if (bytes.byteLength < 1 || bytes.byteLength > PRIVATE_ASSET_LIMITS.deliveryBytes || !(PRIVATE_ASSET_LIMITS.deliveryTypes as readonly string[]).includes(contentType)) throw new Error("invalid_delivery_file");
      const body = new ArrayBuffer(bytes.byteLength); new Uint8Array(body).set(bytes);
      const response = await fetcher(await signedUrl("PUT", objectKey, contentType, 120), { body, headers: { "content-type": contentType }, method: "PUT" });
      if (!response.ok) throw new Error("r2_upload_failed"); const etag = response.headers.get("etag")?.replace(/^"|"$/g, "").trim(); if (!etag) throw new Error("invalid_r2_object_metadata"); return { etag };
    },
    async putImage(objectKey: string, bytes: Uint8Array, declaredContentType: string) {
      if (bytes.byteLength < 1 || bytes.byteLength > PRIVATE_ASSET_LIMITS.imageBytes) throw new Error("invalid_image");
      const contentType = detectSlipContentType(bytes);
      if (contentType !== declaredContentType) throw new Error("invalid_image");
      const body = new ArrayBuffer(bytes.byteLength); new Uint8Array(body).set(bytes);
      const response = await fetcher(await signedUrl("PUT", objectKey, contentType, 120), { body, headers: { "content-type": contentType }, method: "PUT" });
      if (!response.ok) throw new Error("r2_upload_failed"); const etag = response.headers.get("etag")?.replace(/^"|"$/g, "").trim(); if (!etag) throw new Error("invalid_r2_object_metadata");
      return { contentType, etag };
    },
  };
}
