import "server-only";

import { z } from "zod";

import { createPaymentGatewayClient } from "@/features/payments/data/payment-gateway-client.server";
import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

const taskSchema = z.object({ delivery_kind: z.enum(["r2_file", "google_drive"]).nullable(), object_key: z.string().nullable(), target_id: z.uuid(), target_type: z.enum(["delivery", "message_asset", "progress_image", "profile_avatar"]), task_id: z.uuid() });

export async function processCollaborationCleanup(environment: Record<string, string | undefined> = process.env) {
  const gateway = createPaymentGatewayClient(environment); const storage = createR2PrivateAssetsStorage(environment); const { data, error } = await gateway.rpc("claim_cleanup_batch", { p_limit: 10 });
  if (error) throw new Error("Unable to claim cleanup tasks"); const tasks = z.array(taskSchema).parse(data ?? []); let completed = 0; let failed = 0;
  for (const task of tasks) {
    try {
      if (task.object_key) await storage.deleteObject(task.object_key);
      await gateway.rpc("complete_cleanup_task", { p_error: null, p_success: true, p_task_id: task.task_id }); completed += 1;
    } catch (error) {
      await gateway.rpc("complete_cleanup_task", { p_error: error instanceof Error ? error.message : "cleanup_failed", p_success: false, p_task_id: task.task_id }); failed += 1;
    }
  }
  return { completed, failed };
}
