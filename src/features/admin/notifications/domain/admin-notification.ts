export type AdminNotificationKind = "deadline" | "estimate" | "message" | "slip";
export type AdminNotificationItem = { detail: string; href: string; id: string; kind: AdminNotificationKind; occurredAt: string; read: boolean; title: string };
export type AdminNotificationFeed = { items: AdminNotificationItem[]; unreadMessages: number };
export type AdminShellData = { adminEmail: string; adminImageUrl: string | null; notifications: AdminNotificationItem[]; unreadMessages: number };
