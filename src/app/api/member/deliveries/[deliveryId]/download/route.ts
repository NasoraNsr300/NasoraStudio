import { getMemberDeliveryDownload } from "@/features/collaboration/data/collaboration-repository.server";
import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

export async function GET(_request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  try {
    const { deliveryId } = await params;
    const delivery = await getMemberDeliveryDownload(deliveryId);
    if (!delivery) return Response.json({ error: "Delivery unavailable" }, { status: 404 });
    if (delivery.kind === "google_drive" && delivery.external_url) return Response.redirect(delivery.external_url, 307);
    if (delivery.kind === "r2_file" && delivery.object_key) return Response.redirect(await createR2PrivateAssetsStorage().createDownloadUrl(delivery.object_key), 307);
    return Response.json({ error: "Delivery unavailable" }, { status: 404 });
  } catch (error) {
    const auth = error instanceof Error && error.message === "Authentication required";
    return Response.json({ error: auth ? "Authentication required" : "Delivery unavailable" }, { status: auth ? 401 : 404 });
  }
}
