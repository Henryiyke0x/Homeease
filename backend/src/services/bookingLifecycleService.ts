import { prisma } from "../lib/prisma.js";
import { createNotifications } from "./notificationService.js";

export class BookingLifecycleError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "BookingLifecycleError";
  }
}

const bookingWithAssignment = {
  service: { select: { name: true } },
  payments: { select: { status: true, createdAt: true }, orderBy: { createdAt: "desc" as const }, take: 1 },
  assignment: {
    include: { professional: { select: { id: true, firstName: true, lastName: true, phone: true } } },
  },
} as const;

export async function confirmBookingRequest(requestId: string) {
  const request = await prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: { booking: { select: { id: true } } },
  });
  if (!request) throw new BookingLifecycleError("Booking request not found.", 404);

  const openStatuses = ["NEW", "REVIEWING", "CONTACTED"];
  const legacyAccepted = request.status === "ACCEPTED" && !request.booking;
  if (!openStatuses.includes(request.status) && !legacyAccepted) {
    throw new BookingLifecycleError("Only open requests can be confirmed.", 409);
  }
  if (!request.serviceId || request.quotedBasePrice === null) {
    throw new BookingLifecycleError("This request is missing its service or price snapshot.", 409);
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  if (request.preferredDate.toISOString().slice(0, 10) < today) {
    throw new BookingLifecycleError("The requested date has passed. Contact the customer before confirming.", 409);
  }

  const startHours: Record<string, number> = {
    "Morning (8am–12pm)": 8,
    "Afternoon (12pm–4pm)": 12,
    "Evening (4pm–7pm)": 16,
  };
  const schedule = new Date(request.preferredDate);
  schedule.setUTCHours((startHours[request.preferredTime] ?? 8) - 1, 0, 0, 0);

  await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.create({
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
    if (request.customerId) {
      await createNotifications(transaction, [{
        userId: request.customerId,
        type: "BOOKING_CONFIRMED",
        title: "Your booking is confirmed",
        message: `${request.service} is confirmed for ${request.preferredDate.toLocaleDateString()}. Payment is now due.`,
        bookingId: booking.id,
        bookingRequestId: request.id,
      }]);
    }
  });

  return prisma.bookingRequest.findUnique({
    where: { id: request.id },
    include: { booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } } },
  });
}

export async function updateBookingRequestStatus(requestId: string, status: "NEW" | "REVIEWING" | "CONTACTED" | "DECLINED" | "CANCELLED") {
  const existing = await prisma.bookingRequest.findUnique({ where: { id: requestId }, select: { status: true, customerId: true, service: true } });
  if (!existing) throw new BookingLifecycleError("Booking request not found.", 404);
  if (existing.status === "ACCEPTED") {
    throw new BookingLifecycleError("Manage this request through its confirmed booking.", 409);
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.bookingRequest.updateMany({
      where: { id: requestId, status: existing.status },
      data: { status },
    });
    if (changed.count && existing.customerId) {
      const statusLabel = status.toLowerCase().replaceAll("_", " ");
      await createNotifications(transaction, [{
        userId: existing.customerId,
        type: `REQUEST_${status}`,
        title: "Your service request was updated",
        message: `${existing.service}: status changed to ${statusLabel}.`,
        bookingRequestId: requestId,
      }]);
    }
    return changed;
  });
  if (!updated.count) {
    throw new BookingLifecycleError("This request changed while you were updating it. Refresh and try again.", 409);
  }
  return prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: { booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } } },
  });
}

export async function cancelCustomerBookingRequest(requestId: string, customerId: string) {
  const updated = await prisma.bookingRequest.updateMany({
    where: { id: requestId, customerId, status: { in: ["NEW", "REVIEWING", "CONTACTED"] } },
    data: { status: "CANCELLED" },
  });
  if (!updated.count) {
    throw new BookingLifecycleError("This request can no longer be cancelled online.", 409);
  }
  return prisma.bookingRequest.findUnique({
    where: { id: requestId },
    select: { id: true, service: true, quotedBasePrice: true, details: true, preferredDate: true, preferredTime: true, address: true, addressInstructions: true, status: true, createdAt: true },
  });
}

export async function cancelCustomerBooking(bookingId: string, customerId: string) {
  const updated = await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({
      where: { id: bookingId, customerId, status: { in: ["CONFIRMED", "ASSIGNED"] } },
      select: { service: { select: { name: true } }, assignment: { select: { professionalId: true } } },
    });
    if (!booking) return 0;
    const result = await transaction.booking.updateMany({
      where: { id: bookingId, customerId, status: { in: ["CONFIRMED", "ASSIGNED"] } },
      data: { status: "CANCELLED" },
    });
    if (result.count) {
      await createNotifications(transaction, [
        { userId: customerId, type: "BOOKING_CANCELLED", title: "Booking cancelled", message: `Your ${booking.service.name} booking has been cancelled.`, bookingId },
        ...(booking.assignment ? [{ userId: booking.assignment.professionalId, type: "BOOKING_CANCELLED", title: "Booking cancelled", message: `The ${booking.service.name} booking assigned to you has been cancelled.`, bookingId }] : []),
      ]);
    }
    return result.count;
  });
  if (!updated) {
    throw new BookingLifecycleError("This booking can no longer be cancelled online. Contact support if you need help.", 409);
  }
  return prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, status: true } });
}

export async function rescheduleCustomerBooking(bookingId: string, customerId: string, date: string, time: "MORNING" | "AFTERNOON" | "EVENING") {
  const [year, month, day] = date.split("-").map(Number);
  const requestedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    requestedDate.getUTCFullYear() !== year ||
    requestedDate.getUTCMonth() !== month - 1 ||
    requestedDate.getUTCDate() !== day
  ) {
    throw new BookingLifecycleError("Choose a valid date.", 400);
  }

  const startHours = { MORNING: 8, AFTERNOON: 12, EVENING: 16 };
  const scheduledAt = new Date(Date.UTC(year, month - 1, day, startHours[time] - 1));
  if (scheduledAt.getTime() <= Date.now()) {
    throw new BookingLifecycleError("Choose a future time window.", 400);
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({
      where: { id: bookingId, customerId, status: { in: ["CONFIRMED", "ASSIGNED"] } },
      select: { service: { select: { name: true } }, assignment: { select: { professionalId: true } } },
    });
    if (!booking) return 0;
    const result = await transaction.booking.updateMany({
      where: { id: bookingId, customerId, status: { in: ["CONFIRMED", "ASSIGNED"] } },
      data: { scheduledAt },
    });
    if (result.count) {
      const timeLabel = { MORNING: "morning", AFTERNOON: "afternoon", EVENING: "evening" }[time];
      const message = `${booking.service.name} has been moved to ${date} in the ${timeLabel} window.`;
      await createNotifications(transaction, [
        { userId: customerId, type: "BOOKING_RESCHEDULED", title: "Booking rescheduled", message, bookingId },
        ...(booking.assignment ? [{ userId: booking.assignment.professionalId, type: "BOOKING_RESCHEDULED", title: "Booking schedule changed", message: `The assigned ${booking.service.name} booking has been rescheduled to ${date} (${timeLabel}).`, bookingId }] : []),
      ]);
    }
    return result.count;
  });
  if (!updated) {
    throw new BookingLifecycleError("This booking can no longer be rescheduled online. Contact support if you need help.", 409);
  }
  return prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, status: true, scheduledAt: true } });
}

export async function assignBooking(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, customerId: true, service: { select: { name: true } } },
  });
  if (!booking) throw new BookingLifecycleError("Booking not found.", 404);
  if (booking.status !== "CONFIRMED" && booking.status !== "ASSIGNED") {
    throw new BookingLifecycleError("Only confirmed or assigned bookings can be assigned.", 409);
  }
  const successfulPayment = await prisma.payment.findFirst({ where: { bookingId, provider: "paystack", status: "SUCCESS" }, select: { id: true } });
  if (!successfulPayment) {
    throw new BookingLifecycleError("Confirm the customer's payment before assigning this booking.", 409);
  }
  const professional = await prisma.professionalApplication.findFirst({
    where: { userId: professionalId, status: "APPROVED", services: { has: booking.service.name } },
    select: { userId: true },
  });
  if (!professional?.userId) {
    throw new BookingLifecycleError("Choose an approved professional for this service.", 400);
  }

  return prisma.$transaction(async (transaction) => {
    const changed = await transaction.booking.updateMany({
      where: { id: bookingId, status: { in: ["CONFIRMED", "ASSIGNED"] } },
      data: { status: "ASSIGNED" },
    });
    if (!changed.count) {
      throw new BookingLifecycleError("This booking changed while you were assigning it. Refresh and try again.", 409);
    }
    const assignment = await transaction.assignment.upsert({
      where: { bookingId },
      create: { bookingId, professionalId: professional.userId! },
      update: { professionalId: professional.userId!, assignedAt: new Date() },
      include: { professional: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
    await createNotifications(transaction, [
      { userId: professional.userId!, type: "BOOKING_ASSIGNED", title: "A job was assigned to you", message: `${booking.service.name} has been added to your jobs.`, bookingId },
      ...(booking.customerId ? [{ userId: booking.customerId, type: "BOOKING_ASSIGNED", title: "A professional was assigned", message: `A professional has been assigned to your ${booking.service.name} booking.`, bookingId }] : []),
    ]);
    return assignment;
  });
}

export async function cancelBooking(bookingId: string) {
  const result = await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({
      where: { id: bookingId, status: { in: ["CONFIRMED", "ASSIGNED", "IN_PROGRESS"] } },
      select: { customerId: true, service: { select: { name: true } }, assignment: { select: { professionalId: true } } },
    });
    if (!booking) return 0;
    const changed = await transaction.booking.updateMany({
      where: { id: bookingId, status: { in: ["CONFIRMED", "ASSIGNED", "IN_PROGRESS"] } },
      data: { status: "CANCELLED" },
    });
    if (changed.count) {
      await createNotifications(transaction, [
        ...(booking.customerId ? [{ userId: booking.customerId, type: "BOOKING_CANCELLED", title: "Booking cancelled", message: `Your ${booking.service.name} booking was cancelled by HomeEase.`, bookingId }] : []),
        ...(booking.assignment ? [{ userId: booking.assignment.professionalId, type: "BOOKING_CANCELLED", title: "Booking cancelled", message: `The ${booking.service.name} booking assigned to you has been cancelled by HomeEase.`, bookingId }] : []),
      ]);
    }
    return changed.count;
  });
  if (!result) throw new BookingLifecycleError("This booking can no longer be cancelled.", 409);
  return prisma.booking.findUnique({ where: { id: bookingId }, include: bookingWithAssignment });
}

export async function updateProfessionalJobStatus(bookingId: string, professionalId: string, status: "IN_PROGRESS" | "COMPLETED") {
  const assignment = await prisma.assignment.findUnique({
    where: { bookingId },
    include: { booking: { select: { status: true, customerId: true } } },
  });
  if (!assignment || assignment.professionalId !== professionalId) {
    throw new BookingLifecycleError("Assigned job not found.", 404);
  }
  const expectedStatus = status === "IN_PROGRESS" ? "ASSIGNED" : "IN_PROGRESS";
  if (assignment.booking.status !== expectedStatus) {
    throw new BookingLifecycleError("This job cannot move to that status yet.", 409);
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.booking.updateMany({ where: { id: bookingId, status: expectedStatus }, data: { status } });
    if (changed.count && assignment.booking.customerId) {
      const title = status === "IN_PROGRESS" ? "Your service has started" : "Your service is complete";
      const message = status === "IN_PROGRESS"
        ? "Your assigned professional has started the job."
        : "Your assigned professional marked the job complete.";
      await createNotifications(transaction, [{ userId: assignment.booking.customerId, type: `BOOKING_${status}`, title, message, bookingId }]);
    }
    return changed.count;
  });
  if (!updated) {
    throw new BookingLifecycleError("This job changed while you were updating it. Refresh and try again.", 409);
  }
  return { id: bookingId, status };
}
