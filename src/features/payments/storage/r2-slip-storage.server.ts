import "server-only";

import { PAYMENT_LIMITS } from "@/features/payments/domain/payment";

type Environment = Record<string, string | undefined>;
type Method = "GET" | "HEAD" | "PUT";

function required(environment: Environment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error("r2_not_configured");
  return value;
}

function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function encode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`); }
async function sha256(value: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }
async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const rawKey = key instanceof ArrayBuffer ? key : (() => { const copy = new ArrayBuffer(key.byteLength); new Uint8Array(copy).set(key); return copy; })();
  const imported = await crypto.subtle.importKey("raw", rawKey, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", imported, new TextEncoder().encode(value));
}

export function createR2SlipStorage(environment: Environment = process.env, fetcher: typeof fetch = fetch) {
  const accountId = required(environment, "R2_ACCOUNT_ID");
  const accessKeyId = required(environment, "R2_ACCESS_KEY_ID");
  const secretAccessKey = required(environment, "R2_SECRET_ACCESS_KEY");
  const bucket = required(environment, "R2_PAYMENT_SLIPS_BUCKET");
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  async function signedUrl(method: Method, objectKey: string, contentType?: string, expiresIn = 300) {
    if (!objectKey.startsWith("payment-slips/") || expiresIn < 1 || expiresIn > 900) throw new Error("invalid_r2_request");
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = amzDate.slice(0, 8);
    const scope = `${date}/auto/s3/aws4_request`;
    const path = `/${encode(bucket)}/${objectKey.split("/").map(encode).join("/")}`;
    const signedHeaders = contentType ? "content-type;host" : "host";
    const query = new URLSearchParams({ "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD", "X-Amz-Credential": `${accessKeyId}/${scope}`, "X-Amz-Date": amzDate, "X-Amz-Expires": String(expiresIn), "X-Amz-SignedHeaders": signedHeaders });
    const canonicalQuery = [...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const canonicalHeaders = contentType ? `content-type:${contentType}\nhost:${host}\n` : `host:${host}\n`;
    const canonicalRequest = `${method}\n${path}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256(canonicalRequest)}`;
    const dateKey = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), date);
    const regionKey = await hmac(dateKey, "auto");
    const serviceKey = await hmac(regionKey, "s3");
    const signingKey = await hmac(serviceKey, "aws4_request");
    query.set("X-Amz-Signature", hex(await hmac(signingKey, stringToSign)));
    const finalQuery = [...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
    return `${endpoint}${path}?${finalQuery}`;
  }

  return {
    createObjectKey(contentType: (typeof PAYMENT_LIMITS.allowedSlipContentTypes)[number]) {
      const extension = contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
      return `payment-slips/${crypto.randomUUID()}.${extension}`;
    },
    createUploadUrl(objectKey: string, contentType: string) { return signedUrl("PUT", objectKey, contentType, 300); },
    createPreviewUrl(objectKey: string) { return signedUrl("GET", objectKey, undefined, 180); },
    async headObject(objectKey: string) {
      const response = await fetcher(await signedUrl("HEAD", objectKey, undefined, 120), { method: "HEAD" });
      if (!response.ok) throw new Error("r2_object_not_found");
      const sizeBytes = Number(response.headers.get("content-length"));
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
      const etag = response.headers.get("etag")?.replace(/^\"|\"$/g, "") ?? "";
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > PAYMENT_LIMITS.maxSlipBytes || !(PAYMENT_LIMITS.allowedSlipContentTypes as readonly string[]).includes(contentType) || !etag) throw new Error("invalid_r2_object_metadata");
      return { contentType, etag, sizeBytes };
    },
  };
}
