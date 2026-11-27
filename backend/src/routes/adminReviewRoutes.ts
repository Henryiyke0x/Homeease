import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { createNotifications } from "../services/notificationService.js";
import { routeId } from "../utils/routeId.js";

const router = Router();

router.get("/api/admin/reviews", requireAdminKey, async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        booking: { select: { id: true, service: { select: { name: true } } } },
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return res.json(reviews);
  } catch (error) {
    console.error("Failed to load customer reviews", error);
    return res.status(500).json({ error: "We couldn't load customer reviews." });
  }
});

router.patch("/api/admin/reviews/:id", requireAdminKey, async (req, res) => {
  const parsed = z.object({ status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose pending, published or hidden." });
  try {
    const review = await prisma.$transaction(async (transaction) => {
      const current = await transaction.review.findUnique({ where: { id: routeId(req) }, select: { id: true, status: true, customerId: true, booking: { select: { id: true, service: { select: { name: true } } } } } });
      if (!current) return null;
      const updated = await transaction.review.update({ where: { id: current.id }, data: { status: parsed.data.status } });
      if (current.status !== "PUBLISHED" && parsed.data.status === "PUBLISHED") {
        await createNotifications(transaction, [{
          userId: current.customerId,
          type: "REVIEW_PUBLISHED",
          title: "Your review is live",
          message: `Your review of ${current.booking.service.name} has been published on HomeEase.`,
          bookingId: current.booking.id,
        }]);
      }
      return updated;
    });
    if (!review) return res.status(404).json({ error: "Review not found." });
    return res.json(review);
  } catch (error) {
    console.error("Failed to moderate review", error);
    return res.status(500).json({ error: "We couldn't update this review." });
  }
});

export default router;
