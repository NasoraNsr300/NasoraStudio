import { getMemberDeliveryDownload } from "@/features/collaboration/data/collaboration-repository.server";
import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

function downloadName(objectKey: string) {
  const encodedName = objectKey.split("/").at(-1) ?? "nasora-delivery";
  let decodedName = encodedName;
  try { decodedName = decodeURIComponent(encodedName); } catch { /* Keep the safe encoded key. */ }
  const withoutUploadId = decodedName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
  return withoutUploadId.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "nasora-delivery";
}

export async function GET(_request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  try {
    const { deliveryId } = await params;
    const delivery = await getMemberDeliveryDownload(deliveryId);
    if (!delivery) return Response.json({ error: "Delivery unavailable" }, { status: 404 });
    if (delivery.kind === "google_drive" && delivery.external_url) return Response.redirect(delivery.external_url, 307);
    if (delivery.kind === "r2_file" && delivery.object_key) {
      const file = await createR2PrivateAssetsStorage().getObject(delivery.object_key);
      if (!file) return Response.json({ error: "Delivery unavailable" }, { status: 404 });
      const name = downloadName(delivery.object_key);
      return new Response(file.body, {
        headers: {
          "cache-control": "private, no-store",
          "content-disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
          "content-length": String(file.sizeBytes),
          "content-type": file.contentType,
        },
      });
    }
    return Response.json({ error: "Delivery unavailable" }, { status: 404 });
  } catch (error) {
    const auth = error instanceof Error && error.message === "Authentication required";
    return Response.json({ error: auth ? "Authentication required" : "Delivery unavailable" }, { status: auth ? 401 : 404 });
  }
}
