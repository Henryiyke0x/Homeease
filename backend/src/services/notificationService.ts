import type { Prisma } from "@prisma/client";

export type NotificationDraft = {
  userId: string;
  type: string;
  title: string;
  message: string;
  bookingId?: string | null;
  bookingRequestId?: string | null;
};

export async function createNotifications(transaction: Prisma.TransactionClient, notifications: NotificationDraft[]) {
  if (!notifications.length) return;
  await transaction.notification.createMany({ data: notifications });
}
