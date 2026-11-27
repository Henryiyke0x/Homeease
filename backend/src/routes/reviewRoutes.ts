import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getSessionUser } from "../services/sessionService.js";
import { ReviewServiceError, submitBookingReview } from "../services/reviewService.js";
import { routeId } from "../utils/routeId.js";

const router = Router();
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
  displayName: z.string().trim().min(2).max(80),
});

router.get("/api/reviews", async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, rating: true, comment: true, displayName: true, createdAt: true, booking: { select: { service: { select: { name: true } } } } },
    });
    return res.json(reviews);
  } catch (error) {
    console.error("Failed to load public reviews", error);
    return res.status(500).json({ error: "We couldn't load customer reviews." });
  }
});

router.post("/api/customer/bookings/:id/reviews", async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a 1–5 star rating and write a review of 10 to 1,000 characters." });
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to review a completed booking." });
    const review = await submitBookingReview(routeId(req), user.id, parsed.data.rating, parsed.data.comment, parsed.data.displayName);
    return res.status(201).json(review);
  } catch (error) {
    if (error instanceof ReviewServiceError) return res.status(error.statusCode).json({ error: error.message });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A review has already been submitted for this booking." });
    }
    console.error("Failed to submit booking review", error);
    return res.status(500).json({ error: "We couldn't submit your review. Please try again." });
  }
});

export default router;
