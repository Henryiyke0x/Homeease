import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createNotifications } from "./notificationService.js";

type RefundStatus = "PENDING" | "PROCESSING" | "NEEDS_ATTENTION" | "NEEDS_REVIEW" | "FAILED" | "PROCESSED";

export class RefundServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "RefundServiceError";
  }
}

function toMinorUnits(amount: Prisma.Decimal | string) {
  const [whole, fraction = "00"] = typeof amount === "string" ? amount.split(".") : amount.toFixed(2).split(".");
  return Number(`${whole}${fraction.padEnd(2, "0")}`);
}

function fromMinorUnits(amount: number) {
  return new Prisma.Decimal(amount).dividedBy(100);
}

function normalizeRefundStatus(status: string): RefundStatus {
  const statusMap: Record<string, RefundStatus> = {
    pending: "PENDING",
    processing: "PROCESSING",
    "needs-attention": "NEEDS_ATTENTION",
    needs_attention: "NEEDS_ATTENTION",
    failed: "FAILED",
    processed: "PROCESSED",
  };
  return statusMap[status] ?? "NEEDS_REVIEW";
}

async function refreshPaymentRefundStatus(transaction: Prisma.TransactionClient, paymentId: string) {
  const payment = await transaction.payment.findUnique({ where: { id: paymentId }, include: { refunds: true } });
  if (!payment) return;
  const hasOpenRefund = payment.refunds.some((refund) => ["INITIALIZING", "PENDING", "PROCESSING", "NEEDS_ATTENTION", "NEEDS_REVIEW"].includes(refund.status));
  const processedMinor = payment.refunds
    .filter((refund) => refund.status === "PROCESSED")
    .reduce((total, refund) => total + toMinorUnits(refund.amount), 0);
  const paidMinor = toMinorUnits(payment.amount);
  const status = hasOpenRefund
    ? "REFUND_PENDING"
    : processedMinor >= paidMinor
      ? "REFUNDED"
      : processedMinor > 0
        ? "PARTIALLY_REFUNDED"
        : "SUCCESS";
  await transaction.payment.update({ where: { id: payment.id }, data: { status } });
}

export async function createBookingRefund(bookingId: string, requestedAmount: string | undefined, customerNote: string, merchantNote: string) {
  const apiKey = process.env.PAYSTACK_SECRET_KEY;
  if (!apiKey) throw new RefundServiceError("Paystack is not configured.", 503);
  const parsedAmount = requestedAmount === undefined ? null : new Prisma.Decimal(requestedAmount);
  if (parsedAmount && (!parsedAmount.isFinite() || parsedAmount.lte(0))) {
    throw new RefundServiceError("Enter a refund amount greater than zero.", 400);
  }

  const refund = await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, payments: { where: { provider: "paystack" }, orderBy: { createdAt: "desc" }, include: { refunds: true } } },
    });
    if (!booking) throw new RefundServiceError("Booking not found.", 404);
    const payment = booking.payments.find((item) => ["SUCCESS", "PARTIALLY_REFUNDED"].includes(item.status));
    if (!payment) throw new RefundServiceError("This booking has no refundable successful Paystack payment.", 409);
    if (!payment.providerRef) throw new RefundServiceError("The original Paystack payment reference is missing.", 409);
    if (payment.refunds.some((item) => ["INITIALIZING", "PENDING", "PROCESSING", "NEEDS_ATTENTION", "NEEDS_REVIEW"].includes(item.status))) {
      throw new RefundServiceError("A refund for this payment is already awaiting resolution.", 409);
    }

    const alreadyRefunded = payment.refunds.filter((item) => item.status === "PROCESSED").reduce((total, item) => total + toMinorUnits(item.amount), 0);
    const remaining = toMinorUnits(payment.amount) - alreadyRefunded;
    const amount = parsedAmount ? toMinorUnits(parsedAmount) : remaining;
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining) {
      throw new RefundServiceError("Refund amount exceeds the remaining refundable balance.", 400);
    }

    const reserved = await transaction.payment.updateMany({
      where: { id: payment.id, status: payment.status },
      data: { status: "REFUND_PENDING" },
    });
    if (!reserved.count) throw new RefundServiceError("This payment changed while you were preparing the refund. Refresh and try again.", 409);

    const created = await transaction.refund.create({
      data: {
        paymentId: payment.id,
        providerRef: `homeease-refund-${randomUUID()}`,
        amount: fromMinorUnits(amount),
        currency: payment.currency,
        customerNote,
        merchantNote,
      },
    });
    return created;
  });

  const payment = await prisma.payment.findUnique({ where: { id: refund.paymentId }, select: { providerRef: true, currency: true } });
  if (!payment?.providerRef) throw new RefundServiceError("The original Paystack payment reference is missing.", 409);

  let response: Response;
  try {
    response = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction: payment.providerRef,
        amount: String(toMinorUnits(refund.amount)),
        currency: payment.currency,
        customer_note: customerNote,
        merchant_note: merchantNote,
        reference: refund.providerRef,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "NEEDS_REVIEW" } });
    throw new RefundServiceError("Paystack's response was not received. The refund is held for review to avoid sending a duplicate.", 502);
  }

  const payload = await response.json().catch(() => null) as { status?: boolean; data?: { id?: number | string; status?: string } } | null;
  if (!response.ok || payload?.status === false) {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
    await prisma.$transaction((transaction) => refreshPaymentRefundStatus(transaction, refund.paymentId));
    throw new RefundServiceError("Paystack did not accept the refund request.", 502);
  }
  if (!payload?.status || !payload.data) {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "NEEDS_REVIEW" } });
    throw new RefundServiceError("Paystack's response could not be confirmed. The refund is held for review to avoid sending a duplicate.", 502);
  }

  const mappedStatus = normalizeRefundStatus(payload.data.status ?? "pending");
  await applyRefundStatus(refund.id, mappedStatus, payload.data.id === undefined ? null : String(payload.data.id));
  return prisma.refund.findUnique({ where: { id: refund.id }, select: { id: true, amount: true, currency: true, status: true, createdAt: true } });
}

export async function applyRefundStatus(refundId: string, status: RefundStatus, providerRefundId?: string | null) {
  return prisma.$transaction(async (transaction) => {
    const refund = await transaction.refund.findUnique({
      where: { id: refundId },
      include: { payment: { include: { booking: { select: { id: true, customerId: true, service: { select: { name: true } } } } } } },
    });
    if (!refund) return false;
    if (["PROCESSED", "FAILED"].includes(refund.status)) return false;

    const updated = await transaction.refund.updateMany({
      where: { id: refund.id, status: refund.status },
      data: { status, ...(providerRefundId ? { providerRefundId } : {}) },
    });
    if (!updated.count) return false;
    await refreshPaymentRefundStatus(transaction, refund.paymentId);

    const customerId = refund.payment.booking.customerId;
    if (customerId && ["PROCESSED", "FAILED"].includes(status)) {
      const isProcessed = status === "PROCESSED";
      const amount = `NGN ${refund.amount.toFixed(2)}`;
      await createNotifications(transaction, [{
        userId: customerId,
        type: isProcessed ? "REFUND_PROCESSED" : "REFUND_FAILED",
        title: isProcessed ? "Refund processed" : "Refund needs attention",
        message: isProcessed
          ? `Paystack processed your ${amount} refund for ${refund.payment.booking.service.name}. Your bank may take up to 10 business days to show it.`
          : `Paystack could not process your ${amount} refund for ${refund.payment.booking.service.name}. HomeEase will follow up.`,
        bookingId: refund.payment.booking.id,
      }]);
    }
    return true;
  });
}

export async function processPaystackRefundWebhook(event: unknown) {
  if (typeof event !== "object" || event === null || !("event" in event) || typeof event.event !== "string" || !event.event.startsWith("refund.")) return;
  const data = "data" in event ? event.data : null;
  if (typeof data !== "object" || data === null || !("transaction_reference" in data) || typeof data.transaction_reference !== "string") return;
  const amount = "amount" in data ? String(data.amount) : "";
  const amountMinor = Number(amount);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return;
  const refundReference = "refund_reference" in data && typeof data.refund_reference === "string" ? data.refund_reference : null;
  const payment = await prisma.payment.findFirst({ where: { provider: "paystack", providerRef: data.transaction_reference }, select: { id: true } });
  if (!payment) return;

  const refund = refundReference
    ? await prisma.refund.findUnique({ where: { providerRef: refundReference }, select: { id: true, paymentId: true } })
    : await prisma.refund.findFirst({
        where: { paymentId: payment.id, amount: fromMinorUnits(amountMinor), status: { in: ["INITIALIZING", "PENDING", "PROCESSING", "NEEDS_ATTENTION", "NEEDS_REVIEW"] } },
        select: { id: true, paymentId: true },
      });
  if (!refund || refund.paymentId !== payment.id) return;
  const statusValue = "status" in data && typeof data.status === "string" ? data.status : event.event.slice("refund.".length);
  const providerRefundId = "id" in data && (typeof data.id === "number" || typeof data.id === "string") ? String(data.id) : null;
  await applyRefundStatus(refund.id, normalizeRefundStatus(statusValue), providerRefundId);
}
