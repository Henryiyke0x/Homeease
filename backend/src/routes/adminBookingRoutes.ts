import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { routeId } from "../utils/routeId.js";

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
    const request = await prisma.bookingRequest.findUnique({
      where: { id: routeId(req) },
      include: { booking: { select: { id: true } } },
    });
    if (!request) return res.status(404).json({ error: "Booking request not found." });
    const openStatuses = ["NEW", "REVIEWING", "CONTACTED"];
    const isLegacyAcceptedRequest = request.status === "ACCEPTED" && !request.booking;
    if (!openStatuses.includes(request.status) && !isLegacyAcceptedRequest) {
      return res.status(409).json({ error: "Only open requests can be confirmed." });
    }
    if (!request.serviceId || request.quotedBasePrice === null) {
      return res.status(409).json({ error: "This request is missing its service or price snapshot." });
    }

    const currentDateInNigeria = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const requestedDate = request.preferredDate.toISOString().slice(0, 10);
    if (requestedDate < currentDateInNigeria) {
      return res.status(409).json({ error: "The requested date has passed. Contact the customer before confirming." });
    }

    const preferredStartHours: Record<string, number> = {
      "Morning (8amâ€“12pm)": 8,
      "Afternoon (12pmâ€“4pm)": 12,
      "Evening (4pmâ€“7pm)": 16,
    };
    const startHour = preferredStartHours[request.preferredTime] ?? 8;
    const schedule = new Date(request.preferredDate);
    schedule.setUTCHours(startHour - 1, 0, 0, 0); // Nigeria is UTC+1.

    await prisma.$transaction(async (transaction) => {
      await transaction.booking.create({
        data: {
          sourceRequestId: request.id,
          customerId: request.customerId,
          serviceId: request.serviceId!,
          addressId: request.savedAddressId,
          contactName: request.contactName,
          contactPhone: request.phone,
          serviceAddress: request.address,
          addressInstructions: request.addressInstructions,
          scheduledAt: schedule,
          status: "CONFIRMED",
          notes: request.details,
          totalAmount: request.quotedBasePrice!,
        },
      });
      await transaction.bookingRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED" } });
    });

    const confirmed = await prisma.bookingRequest.findUnique({
      where: { id: request.id },
      include: { booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } } },
    });
    return res.status(201).json(confirmed);
  } catch (error) {
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
    const existing = await prisma.bookingRequest.findUnique({ where: { id: routeId(req) }, select: { status: true } });
    if (!existing) return res.status(404).json({ error: "Booking request not found." });
    if (existing.status === "ACCEPTED") return res.status(409).json({ error: "Manage this request through its confirmed booking." });
    const updated = await prisma.bookingRequest.updateMany({
      where: { id: routeId(req), status: existing.status },
      data: { status: parsed.data.status },
    });
    if (updated.count === 0) return res.status(409).json({ error: "This request changed while you were updating it. Refresh and try again." });
    return res.json(await prisma.bookingRequest.findUnique({ where: { id: routeId(req) }, include: { booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } } } }));
  } catch (error) {
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
    const booking = await prisma.booking.findUnique({
      where: { id: routeId(req) },
      select: { status: true, service: { select: { name: true } } },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.status !== "CONFIRMED" && booking.status !== "ASSIGNED") {
      return res.status(409).json({ error: "Only confirmed or assigned bookings can be assigned." });
    }
    const application = await prisma.professionalApplication.findFirst({
      where: { userId: parsed.data.professionalId, status: "APPROVED", services: { has: booking.service.name } },
      select: { userId: true },
    });
    if (!application?.userId) return res.status(400).json({ error: "Choose an approved professional for this service." });

    const assignment = await prisma.$transaction(async (transaction) => {
      const changed = await transaction.booking.updateMany({
        where: { id: routeId(req), status: { in: ["CONFIRMED", "ASSIGNED"] } },
        data: { status: "ASSIGNED" },
      });
      if (changed.count === 0) throw new Error("BOOKING_STATE_CHANGED");
      const updated = await transaction.assignment.upsert({
        where: { bookingId: routeId(req) },
        create: { bookingId: routeId(req), professionalId: application.userId! },
        update: { professionalId: application.userId!, assignedAt: new Date() },
        include: { professional: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      });
      return updated;
    });
    return res.json(assignment);
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_STATE_CHANGED") {
      return res.status(409).json({ error: "This booking changed while you were assigning it. Refresh and try again." });
    }
    console.error("Failed to assign booking", error);
    return res.status(500).json({ error: "We couldn't assign this booking." });
  }
});

router.post("/api/admin/bookings/:id/cancel", requireAdminKey, async (req, res) => {
  try {
    const result = await prisma.booking.updateMany({
      where: { id: routeId(req), status: { in: ["CONFIRMED", "ASSIGNED", "IN_PROGRESS"] } },
      data: { status: "CANCELLED" },
    });
    if (result.count === 0) return res.status(409).json({ error: "This booking can no longer be cancelled." });
    return res.json(await prisma.booking.findUnique({
      where: { id: routeId(req) },
      include: {
        service: { select: { name: true } },
        assignment: { include: { professional: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      },
    }));
  } catch (error) {
    console.error("Failed to cancel booking", error);
    return res.status(500).json({ error: "We couldn't cancel this booking." });
  }
});

export default router;

