import { AdminMessagesWorkspace } from "@/features/admin/messages/components/admin-messages-workspace";
import { listAdminConversations } from "@/features/collaboration/data/collaboration-repository.server";

export default async function AdminMessagesRoute() {
  const conversations = await listAdminConversations();
  return <AdminMessagesWorkspace conversations={conversations} />;
}
