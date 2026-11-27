import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getSessionUser } from "../services/sessionService.js";
import { createNotifications } from "../services/notificationService.js";
import { nigeriaAppointmentDateTime } from "../utils/appointmentTime.js";
import { routeId } from "../utils/routeId.js";
import { BookingLifecycleError, cancelCustomerBooking, cancelCustomerBookingRequest, rescheduleCustomerBooking } from "../services/bookingLifecycleService.js";

const router = Router();

const bookingRequestSchema = z.object({
  service: z.string().trim().min(2).max(80),
  details: z.string().trim().min(5).max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(?:0[8-9]|1[0-8]):00$/),
  address: z.string().trim().min(5).max(300),
  addressId: z.string().min(1).max(30).optional(),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
});

router.post("/api/booking-requests", async (req, res) => {
  const parsed = bookingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn("Invalid booking request fields", parsed.error.issues.map(({ path, code }) => ({ path, code })));
    return res.status(400).json({ error: "Please check the booking details and try again." });
  }

  const scheduledAt = nigeriaAppointmentDateTime(parsed.data.date, parsed.data.time);
  if (!scheduledAt) return res.status(400).json({ error: "Choose a valid date and an hourly start time between 8am and 6pm." });
  if (scheduledAt.getTime() <= Date.now()) return res.status(400).json({ error: "Choose an appointment time in the future." });
  const [year, month, day] = parsed.data.date.split("-").map(Number);
  const preferredDate = new Date(Date.UTC(year, month - 1, day));

  try {
    const customer = await getSessionUser(req);
    const service = await prisma.service.findFirst({
      where: { name: parsed.data.service, isActive: true },
      select: { id: true, basePrice: true },
    });
    if (!service) return res.status(400).json({ error: "That service is not currently available. Please choose another." });
    let savedAddressId: string | null = null;
    let addressSnapshot = parsed.data.address;
    let addressInstructions: string | null = null;
    if (parsed.data.addressId) {
      if (!customer || customer.role !== "CUSTOMER") {
        return res.status(401).json({ error: "Sign in again to use that saved address." });
      }
      const savedAddress = await prisma.address.findFirst({
        where: { id: parsed.data.addressId, customerId: customer.id },
      });
      if (!savedAddress) return res.status(400).json({ error: "Choose one of your saved addresses." });
      savedAddressId = savedAddress.id;
      addressSnapshot = [
        savedAddress.line1,
        savedAddress.city,
        savedAddress.state,
        savedAddress.country !== "Nigeria" ? savedAddress.country : "",
      ].filter(Boolean).join(", ");
      addressInstructions = savedAddress.instructions;
    }
    const bookingRequest = await prisma.$transaction(async (transaction) => {
      const created = await transaction.bookingRequest.create({
        data: {
          customerId: customer?.role === "CUSTOMER" ? customer.id : null,
          savedAddressId,
          serviceId: service.id,
          quotedBasePrice: service.basePrice,
          service: parsed.data.service,
          details: parsed.data.details,
          preferredDate,
          preferredTime: parsed.data.time,
          address: addressSnapshot,
          addressInstructions,
          contactName: parsed.data.contactName,
          phone: parsed.data.phone,
        },
        select: { id: true, status: true, quotedBasePrice: true, createdAt: true },
      });
      if (customer?.role === "CUSTOMER") {
        await createNotifications(transaction, [{
          userId: customer.id,
          type: "REQUEST_RECEIVED",
          title: "We received your service request",
          message: `Your ${parsed.data.service} request is in the HomeEase queue. We'll update you as it's reviewed.`,
          bookingRequestId: created.id,
        }]);
      }
      return created;
    });

    return res.status(201).json(bookingRequest);
  } catch (error) {
    console.error("Failed to create booking request", error);
    return res.status(500).json({ error: "We couldn't save your request. Please try again." });
  }
});
router.get("/api/customer/booking-requests", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to view your requests." });

    const requests = await prisma.bookingRequest.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        service: true,
        quotedBasePrice: true,
        details: true,
        preferredDate: true,
        preferredTime: true,
        address: true,
        addressInstructions: true,
        status: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            totalAmount: true,
            payments: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
            review: { select: { id: true, rating: true, comment: true, displayName: true, status: true, createdAt: true } },
          },
        },
      },
    });
    return res.json(requests);
  } catch (error) {
    console.error("Failed to load customer booking requests", error);
    return res.status(500).json({ error: "We couldn't load your requests." });
  }
});

router.post("/api/customer/booking-requests/:id/cancel", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to cancel a request." });

    return res.json(await cancelCustomerBookingRequest(routeId(req), user.id));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to cancel customer booking request", error);
    return res.status(500).json({ error: "We couldn't cancel this request. Please try again." });
  }
});

router.post("/api/customer/bookings/:id/cancel", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to cancel a booking." });
    return res.json(await cancelCustomerBooking(routeId(req), user.id));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to cancel customer booking", error);
    return res.status(500).json({ error: "We couldn't cancel this booking. Please try again." });
  }
});

router.patch("/api/customer/bookings/:id/reschedule", async (req, res) => {
  const parsed = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^(?:0[8-9]|1[0-8]):00$/),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid date and hourly appointment time." });

  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to reschedule a booking." });
    return res.json(await rescheduleCustomerBooking(routeId(req), user.id, parsed.data.date, parsed.data.time));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to reschedule customer booking", error);
    return res.status(500).json({ error: "We couldn't reschedule this booking. Please try again." });
  }
});

const customerAddressSchema = z.object({
  label: z.string().trim().max(80).optional().or(z.literal("")),
  line1: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(80).optional(),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});


router.get("/api/customer/addresses", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to view saved addresses." });
    const addresses = await prisma.address.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json(addresses);
  } catch (error) {
    console.error("Failed to load customer addresses", error);
    return res.status(500).json({ error: "We couldn't load your saved addresses." });
  }
});



router.post("/api/customer/addresses", async (req, res) => {
  const parsed = customerAddressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the address details and try again." });

  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to save an address." });
    const address = await prisma.address.create({
      data: {
        ...parsed.data,
        label: parsed.data.label || null,
        instructions: parsed.data.instructions || null,
        country: parsed.data.country || "Nigeria",
        customerId: user.id,
      },
    });
    return res.status(201).json(address);
  } catch (error) {
    console.error("Failed to save customer address", error);
    return res.status(500).json({ error: "We couldn't save this address. Please try again." });
  }
});

router.delete("/api/customer/addresses/:id", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to remove a saved address." });
    const result = await prisma.address.deleteMany({ where: { id: routeId(req), customerId: user.id } });
    if (result.count === 0) return res.status(404).json({ error: "Saved address not found." });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove customer address", error);
    return res.status(500).json({ error: "We couldn't remove this address." });
  }
});

export default router;


