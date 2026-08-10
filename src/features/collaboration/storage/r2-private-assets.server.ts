import "server-only";

import { detectSlipContentType } from "@/features/payments/domain/payment";

type Environment = Record<string, string | undefined>;
type Method = "DELETE" | "GET" | "PUT";

function required(environment: Environment, name: string) { const value = environment[name]?.trim(); if (!value) throw new Error("r2_assets_not_configured"); return value; }
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function encode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`); }
async function sha256(value: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }
async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const rawKey = key instanceof ArrayBuffer ? key : (() => { const copy = new ArrayBuffer(key.byteLength); new Uint8Array(copy).set(key); return copy; })();
  const imported = await crypto.subtle.importKey("raw", rawKey, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", imported, new TextEncoder().encode(value));
}

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
    if (!/^(deliveries|message-images|progress-images)\//.test(objectKey) || expiresIn < 1 || expiresIn > 900) throw new Error("invalid_r2_request");
    const amzDate = now().toISOString().replace(/[:-]|\.\d{3}/g, ""); const date = amzDate.slice(0, 8); const scope = `${date}/auto/s3/aws4_request`;
    const path = `/${encode(bucket)}/${objectKey.split("/").map(encode).join("/")}`; const signedHeaders = contentType ? "content-type;host" : "host";
    const query = new URLSearchParams({ "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD", "X-Amz-Credential": `${accessKeyId}/${scope}`, "X-Amz-Date": amzDate, "X-Amz-Expires": String(expiresIn), "X-Amz-SignedHeaders": signedHeaders });
    const canonicalQuery = [...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
    const host = `${accountId}.r2.cloudflarestorage.com`; const canonicalHeaders = contentType ? `content-type:${contentType}\nhost:${host}\n` : `host:${host}\n`;
    const canonicalRequest = `${method}\n${path}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256(canonicalRequest)}`;
    const dateKey = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), date); const regionKey = await hmac(dateKey, "auto"); const serviceKey = await hmac(regionKey, "s3"); const signingKey = await hmac(serviceKey, "aws4_request");
    query.set("X-Amz-Signature", hex(await hmac(signingKey, stringToSign)));
    return `${endpoint}${path}?${[...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&")}`;
  }
  return {
    createDownloadUrl(objectKey: string) { return signedUrl("GET", objectKey, undefined, 180); },
    async deleteObject(objectKey: string) { const response = await fetcher(await signedUrl("DELETE", objectKey, undefined, 60), { method: "DELETE" }); if (!response.ok && response.status !== 404) throw new Error("r2_delete_failed"); },
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
