import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

const liveEnvironment = Object.fromEntries(readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (!match) return [];
  return [[match[1].trim(), match[2].trim().replace(/^['"]|['"]$/g, "")]];
}));
const runLive = process.env.RUN_LIVE_INTEGRATION === "1";
const describeLive = runLive ? describe : describe.skip;
let cleanupKey = "";

describeLive("live portfolio infrastructure", () => {
  afterAll(async () => {
    if (cleanupKey) await createR2PrivateAssetsStorage(liveEnvironment).deleteObject(cleanupKey);
  });

  it("allows anonymous Data API reads through portfolio RLS", async () => {
    const url = liveEnvironment.NEXT_PUBLIC_SUPABASE_URL;
    const key = liveEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toBeTruthy(); expect(key).toBeTruthy();
    const response = await fetch(`${url}/rest/v1/portfolio_items?select=id,title&limit=1`, { headers: { apikey: key!, authorization: `Bearer ${key}` } });
    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  it("uploads, reads, and removes a real workspace image in private R2", async () => {
    const objectKey = `portfolio/${randomUUID()}.jpg`;
    const storage = createR2PrivateAssetsStorage(liveEnvironment);
    const image = new Uint8Array(readFileSync(join(process.cwd(), "..", "..", "Img", "615926480_1367631994643508_5264380239726292867_n.jpg")));
    const result = await storage.putImage(objectKey, image, "image/jpeg"); cleanupKey = objectKey;
    expect(result.contentType).toBe("image/jpeg"); expect(result.etag).toBeTruthy();
    await expect(storage.headObject(objectKey)).resolves.toMatchObject({ contentType: "image/jpeg", sizeBytes: image.byteLength });
    const downloaded = await storage.getObject(objectKey);
    expect(downloaded?.contentType).toBe("image/jpeg");
    expect(new Uint8Array(await new Response(downloaded!.body).arrayBuffer())).toEqual(image);
    await storage.deleteObject(objectKey); cleanupKey = "";
  });
});
