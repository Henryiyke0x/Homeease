import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "homeease-api" }));

app.get("/api/services", async (_req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true, basePrice: true },
    });
    return res.json(services);
  } catch (error) {
    console.error("Failed to load service catalog", error);
    return res.status(500).json({ error: "We couldn't load the available services." });
  }
});

function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) {
    return res.status(503).json({ error: "Admin access is not configured." });
  }

  const provided = Buffer.from(req.get("x-admin-key") ?? "");
  const expected = Buffer.from(expectedKey);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: "Enter a valid admin key." });
  }

  next();
}

function readSessionToken(req: Request) {
  const sessionCookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("homeease_session="));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice("homeease_session=".length)) : null;
}

function routeId(req: Request) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key as Buffer));
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePassword(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await derivePassword(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function createCustomerSession(userId: string, res: Response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.customerSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  res.cookie("homeease_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

async function getSessionUser(req: Request) {
  const token = readSessionToken(req);
  if (!token) return null;
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.customerSession.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

const customerRegistrationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  password: z.string().min(10).max(128),
});
const customerLoginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = customerRegistrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check your account details and use a password of at least 10 characters." });

  try {
    const user = await prisma.user.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    });
    await createCustomerSession(user.id, res);
    return res.status(201).json({ user });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    console.error("Failed to register customer", error);
    return res.status(500).json({ error: "We couldn't create your account. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.role === "ADMIN" || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (user.role === "PROFESSIONAL") {
      const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
      if (application?.status !== "APPROVED") {
        return res.status(403).json({ error: "Your professional application must be approved before you can sign in." });
      }
    }
    await createCustomerSession(user.id, res);
    return res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role } });
  } catch (error) {
    console.error("Failed to sign in customer", error);
    return res.status(500).json({ error: "We couldn't sign you in. Please try again." });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to view your account." });
    return res.json({ user });
  } catch (error) {
    console.error("Failed to load customer session", error);
    return res.status(500).json({ error: "We couldn't load your account." });
  }
});

app.get("/api/customer/booking-requests", async (req, res) => {
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
        booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } },
      },
    });
    return res.json(requests);
  } catch (error) {
    console.error("Failed to load customer booking requests", error);
    return res.status(500).json({ error: "We couldn't load your requests." });
  }
});

app.post("/api/customer/booking-requests/:id/cancel", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to cancel a request." });

    const result = await prisma.bookingRequest.updateMany({
      where: { id: routeId(req), customerId: user.id, status: { in: ["NEW", "REVIEWING", "CONTACTED"] } },
      data: { status: "CANCELLED" },
    });
    if (result.count === 0) {
      return res.status(409).json({ error: "This request can no longer be cancelled online." });
    }

    const request = await prisma.bookingRequest.findUnique({
      where: { id: routeId(req) },
      select: { id: true, service: true, quotedBasePrice: true, details: true, preferredDate: true, preferredTime: true, address: true, addressInstructions: true, status: true, createdAt: true },
    });
    return res.json(request);
  } catch (error) {
    console.error("Failed to cancel customer booking request", error);
    return res.status(500).json({ error: "We couldn't cancel this request. Please try again." });
  }
});

app.get("/api/customer/addresses", async (req, res) => {
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

const customerAddressSchema = z.object({
  label: z.string().trim().max(80).optional().or(z.literal("")),
  line1: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(80).optional(),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});

app.post("/api/customer/addresses", async (req, res) => {
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

app.delete("/api/customer/addresses/:id", async (req, res) => {
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

app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = readSessionToken(req);
    if (token) await prisma.customerSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    res.clearCookie("homeease_session", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to sign out customer", error);
    return res.status(500).json({ error: "We couldn't sign you out. Please try again." });
  }
});

const bookingRequestSchema = z.object({
  service: z.string().trim().min(2).max(80),
  details: z.string().trim().min(5).max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.enum(["Morning (8am–12pm)", "Afternoon (12pm–4pm)", "Evening (4pm–7pm)"]),
  address: z.string().trim().min(5).max(300),
  addressId: z.string().min(1).max(30).optional(),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
});

app.post("/api/booking-requests", async (req, res) => {
  const parsed = bookingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please check the booking details and try again." });
  }

  const [year, month, day] = parsed.data.date.split("-").map(Number);
  const preferredDate = new Date(Date.UTC(year, month - 1, day));
  const todayInNigeria = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (
    preferredDate.getUTCFullYear() !== year ||
    preferredDate.getUTCMonth() !== month - 1 ||
    preferredDate.getUTCDate() !== day ||
    parsed.data.date < todayInNigeria
  ) {
    return res.status(400).json({ error: "Choose a valid date today or later." });
  }

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
    const bookingRequest = await prisma.bookingRequest.create({
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

    return res.status(201).json(bookingRequest);
  } catch (error) {
    console.error("Failed to create booking request", error);
    return res.status(500).json({ error: "We couldn't save your request. Please try again." });
  }
});

function serviceSlug(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  basePrice: z.number().finite().positive().multipleOf(0.01).max(100_000_000),
});

app.get("/api/admin/services", requireAdminKey, async (_req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return res.json(services);
  } catch (error) {
    console.error("Failed to load admin service catalog", error);
    return res.status(500).json({ error: "We couldn't load the service catalog." });
  }
});

app.post("/api/admin/services", requireAdminKey, async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the service name, description and price." });

  try {
    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        slug: serviceSlug(parsed.data.name),
      },
    });
    return res.status(201).json(service);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A service with this name already exists." });
    }
    console.error("Failed to create service", error);
    return res.status(500).json({ error: "We couldn't save this service." });
  }
});

app.patch("/api/admin/services/:id", requireAdminKey, async (req, res) => {
  const parsed = serviceSchema.extend({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the service name, description, price and availability." });

  try {
    const service = await prisma.service.update({
      where: { id: routeId(req) },
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        slug: serviceSlug(parsed.data.name),
      },
    });
    return res.json(service);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Service not found." });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A service with this name already exists." });
    }
    console.error("Failed to update service", error);
    return res.status(500).json({ error: "We couldn't update this service." });
  }
});

app.get("/api/admin/booking-requests", requireAdminKey, async (_req, res) => {
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

app.post("/api/admin/booking-requests/:id/confirm", requireAdminKey, async (req, res) => {
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
      "Morning (8am–12pm)": 8,
      "Afternoon (12pm–4pm)": 12,
      "Evening (4pm–7pm)": 16,
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

app.patch("/api/admin/booking-requests/:id", requireAdminKey, async (req, res) => {
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

app.get("/api/admin/bookings", requireAdminKey, async (_req, res) => {
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

app.get("/api/admin/available-professionals", requireAdminKey, async (_req, res) => {
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

app.post("/api/admin/bookings/:id/assign", requireAdminKey, async (req, res) => {
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

app.post("/api/admin/bookings/:id/cancel", requireAdminKey, async (req, res) => {
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

app.get("/api/professional/jobs", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "PROFESSIONAL") return res.status(401).json({ error: "Sign in with your professional account." });
    const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
    if (application?.status !== "APPROVED") return res.status(403).json({ error: "Your professional account is not active." });

    const jobs = await prisma.assignment.findMany({
      where: { professionalId: user.id },
      orderBy: { assignedAt: "desc" },
      include: { booking: { include: { service: { select: { name: true } } } } },
    });
    return res.json(jobs);
  } catch (error) {
    console.error("Failed to load professional jobs", error);
    return res.status(500).json({ error: "We couldn't load your jobs." });
  }
});

app.patch("/api/professional/jobs/:id/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(["IN_PROGRESS", "COMPLETED"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid job status." });

  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "PROFESSIONAL") return res.status(401).json({ error: "Sign in with your professional account." });
    const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
    if (application?.status !== "APPROVED") return res.status(403).json({ error: "Your professional account is not active." });

    const assignment = await prisma.assignment.findUnique({
      where: { bookingId: routeId(req) },
      include: { booking: { select: { status: true } } },
    });
    if (!assignment || assignment.professionalId !== user.id) return res.status(404).json({ error: "Assigned job not found." });
    const expectedStatus = parsed.data.status === "IN_PROGRESS" ? "ASSIGNED" : "IN_PROGRESS";
    if (assignment.booking.status !== expectedStatus) return res.status(409).json({ error: "This job cannot move to that status yet." });

    const updated = await prisma.booking.updateMany({ where: { id: routeId(req), status: expectedStatus }, data: { status: parsed.data.status } });
    if (updated.count === 0) return res.status(409).json({ error: "This job changed while you were updating it. Refresh and try again." });
    return res.json({ id: routeId(req), status: parsed.data.status });
  } catch (error) {
    console.error("Failed to update professional job", error);
    return res.status(500).json({ error: "We couldn't update this job." });
  }
});

const professionalApplicationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  services: z.array(z.string().trim().min(2).max(80)).min(1).max(10),
  yearsExperience: z.number().int().min(0).max(60),
  about: z.string().trim().min(20).max(2000),
  password: z.string().min(10).max(128),
}).refine((application) => new Set(application.services).size === application.services.length, {
  message: "Choose each service only once.",
});

app.post("/api/professional-applications", async (req, res) => {
  const parsed = professionalApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please check your application details and try again." });
  }

  try {
    const availableServices = await prisma.service.findMany({
      where: { name: { in: parsed.data.services }, isActive: true },
      select: { name: true },
    });
    if (availableServices.length !== parsed.data.services.length) {
      return res.status(400).json({ error: "Choose only services currently offered by HomeEase." });
    }
    const { password, ...applicationData } = parsed.data;
    const passwordHash = await hashPassword(password);
    const application = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: applicationData.email,
          firstName: applicationData.firstName,
          lastName: applicationData.lastName,
          phone: applicationData.phone,
          passwordHash,
          role: "PROFESSIONAL",
        },
        select: { id: true },
      });
      return transaction.professionalApplication.create({
        data: { ...applicationData, userId: user.id },
        select: { id: true, status: true, createdAt: true },
      });
    });
    return res.status(201).json(application);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "An account or application with this email already exists." });
    }
    console.error("Failed to create professional application", error);
    return res.status(500).json({ error: "We couldn't save your application. Please try again." });
  }
});

app.get("/api/admin/professional-applications", requireAdminKey, async (_req, res) => {
  try {
    const applications = await prisma.professionalApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json(applications);
  } catch (error) {
    console.error("Failed to load professional applications", error);
    return res.status(500).json({ error: "We couldn't load the professional applications." });
  }
});

app.patch("/api/admin/professional-applications/:id", requireAdminKey, async (req, res) => {
  const parsed = z.object({
    status: z.enum(["PENDING", "REVIEWING", "APPROVED", "DECLINED"]),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Choose a valid application status." });
  }

  try {
    const updated = await prisma.professionalApplication.update({
      where: { id: routeId(req) },
      data: { status: parsed.data.status },
    });
    return res.json(updated);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Professional application not found." });
    }
    console.error("Failed to update professional application", error);
    return res.status(500).json({ error: "We couldn't update the professional application." });
  }
});

export default app;
