import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

const liveEnvironment = Object.fromEntries(readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); if (!match) return [];
  return [[match[1].trim(), match[2].trim().replace(/^['"]|['"]$/g, "")]];
}));
const describeLive = process.env.RUN_LIVE_INTEGRATION === "1" ? describe : describe.skip;
let cleanupKey = "";

describeLive("live documents infrastructure", () => {
  afterAll(async () => { if (cleanupKey) await createR2PrivateAssetsStorage(liveEnvironment).deleteObject(cleanupKey); });

  it("allows anonymous published reads but denies direct writes and admin RPC", async () => {
    const url = liveEnvironment.NEXT_PUBLIC_SUPABASE_URL; const key = liveEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toBeTruthy(); expect(key).toBeTruthy(); const headers = { apikey: key!, authorization: `Bearer ${key}` };
    const read = await fetch(`${url}/rest/v1/public_documents?select=id,slug&limit=1`, { headers });
    expect(read.status).toBe(200); expect(Array.isArray(await read.json())).toBe(true);
    const write = await fetch(`${url}/rest/v1/public_documents`, { body: JSON.stringify({ category: "guide", slug: "forbidden" }), headers: { ...headers, "content-type": "application/json" }, method: "POST" });
    expect([401, 403]).toContain(write.status);
    const rpc = await fetch(`${url}/rest/v1/rpc/admin_save_public_document`, { body: JSON.stringify({}), headers: { ...headers, "content-type": "application/json" }, method: "POST" });
    expect([401, 403, 404]).toContain(rpc.status);
  });

  it("uploads and removes a document cover in private R2", async () => {
    const objectKey = `document-covers/${randomUUID()}.png`; const storage = createR2PrivateAssetsStorage(liveEnvironment);
    const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    const result = await storage.putImage(objectKey, image, "image/png"); cleanupKey = objectKey;
    expect(result.contentType).toBe("image/png"); expect(result.etag).toBeTruthy();
    await storage.deleteObject(objectKey); cleanupKey = "";
  });
});
