import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getSessionUser } from "../services/sessionService.js";
import { routeId } from "../utils/routeId.js";

const router = Router();
const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  bookingId: true,
  bookingRequestId: true,
  readAt: true,
  createdAt: true,
} as const;

router.get("/api/notifications", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || !["CUSTOMER", "PROFESSIONAL"].includes(user.role)) return res.status(401).json({ error: "Sign in to view your notifications." });
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: notificationSelect,
    });
    return res.json(notifications);
  } catch (error) {
    console.error("Failed to load customer notifications", error);
    return res.status(500).json({ error: "We couldn't load your notifications." });
  }
});

router.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || !["CUSTOMER", "PROFESSIONAL"].includes(user.role)) return res.status(401).json({ error: "Sign in to update your notifications." });
    const notification = await prisma.notification.findFirst({ where: { id: routeId(req), userId: user.id }, select: notificationSelect });
    if (!notification) return res.status(404).json({ error: "Notification not found." });
    if (!notification.readAt) {
      await prisma.notification.updateMany({ where: { id: notification.id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    }
    return res.json({ ...notification, readAt: notification.readAt ?? new Date() });
  } catch (error) {
    console.error("Failed to mark customer notification as read", error);
    return res.status(500).json({ error: "We couldn't update this notification." });
  }
});

export default router;
