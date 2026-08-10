import "server-only";

import { AwsV4Signer } from "aws4fetch";

import { PAYMENT_LIMITS } from "@/features/payments/domain/payment";

type Environment = Record<string, string | undefined>;
type Method = "DELETE" | "GET" | "HEAD" | "PUT";

function required(environment: Environment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error("r2_not_configured");
  return value;
}

function encode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`); }

export function normalizeEtag(value: string) {
  const normalized = value.trim();
  if (normalized.startsWith('W/"') && normalized.endsWith('"')) return `W/${normalized.slice(3, -1)}`;
  return normalized.replace(/^"|"$/g, "").trim();
}

export function createR2SlipStorage(environment: Environment = process.env, fetcher: typeof fetch = fetch, now: () => Date = () => new Date()) {
  const accountId = required(environment, "R2_ACCOUNT_ID");
  const accessKeyId = required(environment, "R2_ACCESS_KEY_ID");
  const secretAccessKey = required(environment, "R2_SECRET_ACCESS_KEY");
  const bucket = required(environment, "R2_PAYMENT_SLIPS_BUCKET");
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  async function signedUrl(method: Method, objectKey: string, contentType?: string, expiresIn = 300) {
    if (!objectKey.startsWith("payment-slips/") || expiresIn < 1 || expiresIn > 900) throw new Error("invalid_r2_request");
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
    createPreviewUrl(objectKey: string) { return signedUrl("GET", objectKey, undefined, 180); },
    async deleteObject(objectKey: string) {
      const response = await fetcher(await signedUrl("DELETE", objectKey, undefined, 60), { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("r2_delete_failed");
    },
    async putObject(objectKey: string, bytes: Uint8Array, contentType: string) {
      if (bytes.byteLength < 1 || bytes.byteLength > PAYMENT_LIMITS.maxSlipBytes || !(PAYMENT_LIMITS.allowedSlipContentTypes as readonly string[]).includes(contentType)) throw new Error("invalid_r2_request");
      const body = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(body).set(bytes);
      const response = await fetcher(await signedUrl("PUT", objectKey, contentType, 120), { body, headers: { "content-type": contentType }, method: "PUT" });
      if (!response.ok) throw new Error("r2_upload_failed");
      const etag = normalizeEtag(response.headers.get("etag") ?? "");
      if (!etag) throw new Error("invalid_r2_object_metadata");
      return { etag };
    },
    async headObject(objectKey: string) {
      const response = await fetcher(await signedUrl("HEAD", objectKey, undefined, 120), { method: "HEAD" });
      if (!response.ok) throw new Error("r2_object_not_found");
      const sizeBytes = Number(response.headers.get("content-length"));
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
      const etag = normalizeEtag(response.headers.get("etag") ?? "");
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > PAYMENT_LIMITS.maxSlipBytes || !(PAYMENT_LIMITS.allowedSlipContentTypes as readonly string[]).includes(contentType) || !etag) throw new Error("invalid_r2_object_metadata");
      return { contentType, etag, sizeBytes };
    },
  };
}
