import { prisma } from "../lib/prisma.js";

export class ReviewServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "ReviewServiceError";
  }
}

export async function submitBookingReview(bookingId: string, customerId: string, rating: number, comment: string, displayName: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId },
    select: { id: true, status: true, review: { select: { id: true } } },
  });
  if (!booking) throw new ReviewServiceError("Completed booking not found.", 404);
  if (booking.status !== "COMPLETED") throw new ReviewServiceError("You can review a booking after the service is completed.", 409);
  if (booking.review) throw new ReviewServiceError("You have already submitted a review for this booking.", 409);

  return prisma.review.create({
    data: { bookingId, customerId, rating, comment, displayName, status: "PENDING" },
    select: { id: true, rating: true, comment: true, displayName: true, status: true, createdAt: true },
  });
}
