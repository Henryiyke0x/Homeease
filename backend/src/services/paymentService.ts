import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { createNotifications } from "./notificationService.js";

type PaystackTransaction = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
};

type PaystackEnvelope<T> = { status: boolean; message?: string; data: T };

export class PaymentServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

function secretKey() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new PaymentServiceError("Online payments are not configured yet.", 503);
  return secret;
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
  });
  const payload = await response.json().catch(() => null) as PaystackEnvelope<T> | null;
  if (!response.ok || !payload?.status || !payload.data) {
    throw new PaymentServiceError("Paystack could not process the payment request. Please try again.", 502);
  }
  return payload.data;
}

function amountInKobo(amount: { toFixed: (digits: number) => string }) {
  const [naira, kobo] = amount.toFixed(2).split(".");
  const minorAmount = Number(`${naira}${kobo}`);
  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
    throw new PaymentServiceError("This booking has an invalid payment amount.", 409);
  }
  return minorAmount;
}

export async function initializeBookingPayment(bookingId: string, customerId: string) {
  secretKey();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: { select: { id: true, email: true } } },
  });
  if (!booking || booking.customerId !== customerId || !booking.customer) {
    throw new PaymentServiceError("Booking not found.", 404);
  }
  if (!["CONFIRMED", "ASSIGNED"].includes(booking.status)) {
    throw new PaymentServiceError("Only confirmed bookings can be paid online.", 409);
  }

  const successfulPayment = await prisma.payment.findFirst({
    where: { bookingId, provider: "paystack", status: "SUCCESS" },
    select: { id: true },
  });
  if (successfulPayment) return { authorizationUrl: null, alreadyPaid: true };

  const pendingPayment = await prisma.payment.findFirst({
    where: { bookingId, provider: "paystack", status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (pendingPayment) {
    if (!pendingPayment.checkoutUrl) {
      throw new PaymentServiceError("A payment is already being prepared. Please try again in a moment.", 409);
    }
    return { authorizationUrl: pendingPayment.checkoutUrl, alreadyPaid: false };
  }

  const reference = `homeease-${randomUUID()}`;
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      provider: "paystack",
      providerRef: reference,
      amount: booking.totalAmount,
      currency: "NGN",
      status: "PENDING",
    },
  });

  try {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const callbackUrl = new URL("/account/payment/callback", frontendUrl).toString();
    const initialized = await paystackRequest<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: booking.customer.email,
        amount: String(amountInKobo(booking.totalAmount)),
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: { bookingId, paymentId: payment.id },
      }),
    });
    if (!initialized.authorization_url || initialized.reference !== reference) {
      throw new PaymentServiceError("Paystack returned an invalid checkout session. Please try again.", 502);
    }
    await prisma.payment.update({ where: { id: payment.id }, data: { checkoutUrl: initialized.authorization_url } });
    return { authorizationUrl: initialized.authorization_url, alreadyPaid: false };
  } catch (error) {
    await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
    if (error instanceof PaymentServiceError) throw error;
    throw new PaymentServiceError("Paystack is temporarily unavailable. Please try again.", 502);
  }
}

async function getVerifiedTransaction(reference: string) {
  return paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

async function reconcileTransaction(reference: string) {
  const payment = await prisma.payment.findFirst({ where: { provider: "paystack", providerRef: reference } });
  if (!payment) throw new PaymentServiceError("Payment reference not found.", 404);
  if (payment.status === "SUCCESS") return { paymentStatus: "SUCCESS" as const, bookingId: payment.bookingId };

  const transaction = await getVerifiedTransaction(reference);
  if (transaction.reference !== reference) throw new PaymentServiceError("Paystack returned a mismatched payment reference.", 502);

  if (transaction.status === "success") {
    const expectedKobo = amountInKobo(payment.amount);
    if (transaction.amount !== expectedKobo || transaction.currency !== payment.currency) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCESS" } }, data: { status: "AMOUNT_MISMATCH" } });
      return { paymentStatus: "AMOUNT_MISMATCH", bookingId: payment.bookingId };
    }
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCESS" } }, data: { status: "SUCCESS" } });
      if (updated.count) {
        const booking = await transaction.booking.findUnique({ where: { id: payment.bookingId }, select: { customerId: true, service: { select: { name: true } } } });
        if (booking?.customerId) {
          await createNotifications(transaction, [{
            userId: booking.customerId,
            type: "PAYMENT_CONFIRMED",
            title: "Payment confirmed",
            message: `Your payment for ${booking.service.name} was received. HomeEase can now assign your booking.`,
            bookingId: payment.bookingId,
          }]);
        }
      }
    });
    return { paymentStatus: "SUCCESS" as const, bookingId: payment.bookingId };
  }

  const statusMap: Record<string, string> = { failed: "FAILED", abandoned: "ABANDONED", reversed: "REVERSED" };
  const nextStatus = statusMap[transaction.status];
  if (nextStatus) await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: nextStatus } });
  return { paymentStatus: nextStatus ?? "PENDING", bookingId: payment.bookingId };
}

export async function verifyCustomerPayment(reference: string, customerId: string) {
  const payment = await prisma.payment.findFirst({
    where: { provider: "paystack", providerRef: reference },
    include: { booking: { select: { customerId: true } } },
  });
  if (!payment || payment.booking.customerId !== customerId) {
    throw new PaymentServiceError("Payment reference not found.", 404);
  }
  return reconcileTransaction(reference);
}

export async function processPaystackWebhook(event: unknown) {
  if (typeof event !== "object" || event === null || !("event" in event) || event.event !== "charge.success") return;
  const data = "data" in event ? event.data : null;
  if (typeof data !== "object" || data === null || !("reference" in data) || typeof data.reference !== "string") return;
  const payment = await prisma.payment.findFirst({ where: { provider: "paystack", providerRef: data.reference }, select: { id: true } });
  if (payment) await reconcileTransaction(data.reference);
}

function safeSignatureMatch(expectedHex: string, providedHex: string) {
  if (!/^[0-9a-f]{128}$/i.test(providedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function verifyPaystackWebhookSignature(rawBody: Buffer, paystackSignature: string | undefined, legacySignature: string | undefined) {
  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (webhookSecret && paystackSignature) {
    let timestamp: number | null = null;
    const signatures: string[] = [];
    for (const part of paystackSignature.split(",")) {
      const separator = part.indexOf("=");
      if (separator < 0) continue;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (name === "t" && timestamp === null && /^\d+$/.test(value)) timestamp = Number(value);
      if (name === "v1") {
        const colon = value.indexOf(":");
        if (colon >= 0) signatures.push(value.slice(colon + 1));
      }
    }
    const now = Math.floor(Date.now() / 1000);
    if (timestamp !== null && Math.abs(now - timestamp) <= 300) {
      const expected = createHmac("sha512", webhookSecret).update(`${timestamp}.`).update(rawBody).digest("hex");
      if (signatures.some((signature) => safeSignatureMatch(expected, signature))) return true;
    }
  }

  const key = process.env.PAYSTACK_SECRET_KEY;
  if (key && legacySignature) {
    const expected = createHmac("sha512", key).update(rawBody).digest("hex");
    if (safeSignatureMatch(expected, legacySignature)) return true;
  }
  return false;
}
