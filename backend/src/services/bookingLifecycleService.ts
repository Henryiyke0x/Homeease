import { prisma } from "../lib/prisma.js";

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
    "Morning (8amâ€“12pm)": 8,
    "Afternoon (12pmâ€“4pm)": 12,
    "Evening (4pmâ€“7pm)": 16,
  };
  const schedule = new Date(request.preferredDate);
  schedule.setUTCHours((startHours[request.preferredTime] ?? 8) - 1, 0, 0, 0);

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

  return prisma.bookingRequest.findUnique({
    where: { id: request.id },
    include: { booking: { select: { id: true, status: true, scheduledAt: true, totalAmount: true } } },
  });
}

export async function updateBookingRequestStatus(requestId: string, status: "NEW" | "REVIEWING" | "CONTACTED" | "DECLINED" | "CANCELLED") {
  const existing = await prisma.bookingRequest.findUnique({ where: { id: requestId }, select: { status: true } });
  if (!existing) throw new BookingLifecycleError("Booking request not found.", 404);
  if (existing.status === "ACCEPTED") {
    throw new BookingLifecycleError("Manage this request through its confirmed booking.", 409);
  }
  const updated = await prisma.bookingRequest.updateMany({
    where: { id: requestId, status: existing.status },
    data: { status },
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

export async function assignBooking(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, service: { select: { name: true } } },
  });
  if (!booking) throw new BookingLifecycleError("Booking not found.", 404);
  if (booking.status !== "CONFIRMED" && booking.status !== "ASSIGNED") {
    throw new BookingLifecycleError("Only confirmed or assigned bookings can be assigned.", 409);
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
    return transaction.assignment.upsert({
      where: { bookingId },
      create: { bookingId, professionalId: professional.userId! },
      update: { professionalId: professional.userId!, assignedAt: new Date() },
      include: { professional: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
  });
}

export async function cancelBooking(bookingId: string) {
  const result = await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: ["CONFIRMED", "ASSIGNED", "IN_PROGRESS"] } },
    data: { status: "CANCELLED" },
  });
  if (!result.count) throw new BookingLifecycleError("This booking can no longer be cancelled.", 409);
  return prisma.booking.findUnique({ where: { id: bookingId }, include: bookingWithAssignment });
}

export async function updateProfessionalJobStatus(bookingId: string, professionalId: string, status: "IN_PROGRESS" | "COMPLETED") {
  const assignment = await prisma.assignment.findUnique({
    where: { bookingId },
    include: { booking: { select: { status: true } } },
  });
  if (!assignment || assignment.professionalId !== professionalId) {
    throw new BookingLifecycleError("Assigned job not found.", 404);
  }
  const expectedStatus = status === "IN_PROGRESS" ? "ASSIGNED" : "IN_PROGRESS";
  if (assignment.booking.status !== expectedStatus) {
    throw new BookingLifecycleError("This job cannot move to that status yet.", 409);
  }
  const updated = await prisma.booking.updateMany({ where: { id: bookingId, status: expectedStatus }, data: { status } });
  if (!updated.count) {
    throw new BookingLifecycleError("This job changed while you were updating it. Refresh and try again.", 409);
  }
  return { id: bookingId, status };
}
