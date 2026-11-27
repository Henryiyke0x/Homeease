import { prisma } from "../lib/prisma.js";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 30_000;
const STALE_CLAIM_MS = 5 * 60_000;

function normalizeNigerianPhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{10}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^\d{10,15}$/.test(digits) && !digits.startsWith("0")) return digits;
  return null;
}

function getSmsText(title: string, message: string) {
  return `HomeEase: ${title}. ${message}`.replace(/\s+/g, " ").trim().slice(0, 300);
}

async function sendTermiiSms(to: string, sms: string) {
  const apiKey = process.env.TERMII_API_KEY;
  const baseUrl = process.env.TERMII_BASE_URL?.replace(/\/+$/, "");
  const senderId = process.env.TERMII_SENDER_ID;
  if (!apiKey || !baseUrl || !senderId) throw new Error("Termii SMS delivery is not configured.");

  const endpoint = new URL("/api/sms/send", baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, to, from: senderId, sms, type: "plain", channel: "dnd" }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Termii returned HTTP ${response.status}.`);
  const result = await response.json() as { code?: string; message?: string };
  if (result.code && result.code.toLowerCase() !== "ok") throw new Error("Termii did not accept the SMS.");
}

export async function dispatchPendingNotificationSms() {
  if (process.env.NOTIFICATION_SMS_ENABLED !== "true" || !process.env.TERMII_API_KEY || !process.env.TERMII_BASE_URL || !process.env.TERMII_SENDER_ID) return;

  const now = new Date();
  const retryBefore = new Date(now.getTime() - RETRY_DELAY_MS);
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const pending = await prisma.notification.findMany({
    where: {
      OR: [
        { smsStatus: "PENDING", OR: [{ smsLastAttemptAt: null }, { smsLastAttemptAt: { lte: retryBefore } }] },
        { smsStatus: "SENDING", smsLastAttemptAt: { lte: staleBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 25,
    include: { user: { select: { phone: true } } },
  });

  for (const notification of pending) {
    const phone = normalizeNigerianPhone(notification.user.phone);
    if (!phone) {
      await prisma.notification.updateMany({
        where: { id: notification.id, smsStatus: notification.smsStatus },
        data: { smsStatus: "SKIPPED", smsLastError: "No supported Nigerian phone number is available." },
      });
      continue;
    }

    if (notification.smsAttemptCount >= MAX_ATTEMPTS) {
      await prisma.notification.updateMany({
        where: { id: notification.id, smsStatus: notification.smsStatus },
        data: { smsStatus: "FAILED", smsLastError: "Maximum delivery attempts reached." },
      });
      continue;
    }

    const claimedAt = new Date();
    const nextAttempt = notification.smsAttemptCount + 1;
    const claimed = await prisma.notification.updateMany({
      where: {
        id: notification.id,
        smsStatus: notification.smsStatus,
        smsLastAttemptAt: notification.smsLastAttemptAt,
      },
      data: { smsStatus: "SENDING", smsAttemptCount: nextAttempt, smsLastAttemptAt: claimedAt, smsLastError: null },
    });
    if (!claimed.count) continue;

    try {
      await sendTermiiSms(phone, getSmsText(notification.title, notification.message));
      await prisma.notification.updateMany({
        where: { id: notification.id, smsStatus: "SENDING" },
        data: { smsStatus: "SENT", smsSentAt: new Date(), smsLastError: null },
      });
    } catch {
      await prisma.notification.updateMany({
        where: { id: notification.id, smsStatus: "SENDING" },
        data: {
          smsStatus: nextAttempt >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          smsLastError: "SMS provider request failed.",
        },
      });
    }
  }
}
