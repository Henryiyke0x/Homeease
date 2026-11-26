import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { routeId } from "../utils/routeId.js";
import { assignBooking, BookingLifecycleError, cancelBooking, confirmBookingRequest, updateBookingRequestStatus } from "../services/bookingLifecycleService.js";

const router = Router();

router.get("/api/admin/booking-requests", requireAdminKey, async (_req, res) => {
  try {
    const requests = await prisma.bookingRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } } },
    });
    return res.json(requests);
  } catch (error) {
    console.error("Failed to load booking requests", error);
    return res.status(500).json({ error: "We couldn't load the booking requests." });
  }
});

router.post("/api/admin/booking-requests/:id/confirm", requireAdminKey, async (req, res) => {
  try {
    const confirmed = await confirmBookingRequest(routeId(req));
    return res.status(201).json(confirmed);
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "This request already has a booking." });
    }
    console.error("Failed to confirm booking request", error);
    return res.status(500).json({ error: "We couldn't confirm this booking request." });
  }
});

router.patch("/api/admin/booking-requests/:id", requireAdminKey, async (req, res) => {
  const parsed = z.object({
    status: z.enum(["NEW", "REVIEWING", "CONTACTED", "DECLINED", "CANCELLED"]),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Choose a valid request status." });
  }

  try {
    return res.json(await updateBookingRequestStatus(routeId(req), parsed.data.status));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Booking request not found." });
    }
    console.error("Failed to update booking request", error);
    return res.status(500).json({ error: "We couldn't update the booking request." });
  }
});

router.get("/api/admin/bookings", requireAdminKey, async (_req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { scheduledAt: "asc" },
      include: {
        service: { select: { name: true } },
        assignment: { include: { professional: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        payments: { select: { status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return res.json(bookings);
  } catch (error) {
    console.error("Failed to load bookings", error);
    return res.status(500).json({ error: "We couldn't load bookings." });
  }
});

router.get("/api/admin/available-professionals", requireAdminKey, async (_req, res) => {
  try {
    const professionals = await prisma.professionalApplication.findMany({
      where: { status: "APPROVED", userId: { not: null } },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        city: true,
        state: true,
        services: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return res.json(professionals.filter((item) => item.user).map((item) => ({ ...item.user!, city: item.city, state: item.state, services: item.services })));
  } catch (error) {
    console.error("Failed to load approved professionals", error);
    return res.status(500).json({ error: "We couldn't load approved professionals." });
  }
});

router.post("/api/admin/bookings/:id/assign", requireAdminKey, async (req, res) => {
  const parsed = z.object({ professionalId: z.string().min(1).max(50) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose an approved professional." });

  try {
    return res.json(await assignBooking(routeId(req), parsed.data.professionalId));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to assign booking", error);
    return res.status(500).json({ error: "We couldn't assign this booking." });
  }
});

router.post("/api/admin/bookings/:id/cancel", requireAdminKey, async (req, res) => {
  try {
    return res.json(await cancelBooking(routeId(req)));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to cancel booking", error);
    return res.status(500).json({ error: "We couldn't cancel this booking." });
  }
});

export default router;

