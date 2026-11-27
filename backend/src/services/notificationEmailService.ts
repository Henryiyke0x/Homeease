import { prisma } from "../lib/prisma.js";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 30_000;
const STALE_CLAIM_MS = 5 * 60_000;

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function sendResendEmail(to: string, subject: string, message: string, notificationId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Resend email delivery is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `homeease-notification-${notificationId}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: message,
      html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;color:#173d32"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#228566">HomeEase update</p><h1 style="font-size:24px">${escapeHtml(subject)}</h1><p style="font-size:16px;line-height:1.6;color:#494d49">${escapeHtml(message)}</p></main>`,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
}

export async function dispatchPendingNotificationEmails() {
  if (process.env.NOTIFICATION_EMAIL_ENABLED !== "true" || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;

  const now = new Date();
  const retryBefore = new Date(now.getTime() - RETRY_DELAY_MS);
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const pending = await prisma.notification.findMany({
    where: {
      OR: [
        { emailStatus: "PENDING", OR: [{ emailLastAttemptAt: null }, { emailLastAttemptAt: { lte: retryBefore } }] },
        { emailStatus: "SENDING", emailLastAttemptAt: { lte: staleBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 25,
    include: { user: { select: { email: true } } },
  });

  for (const notification of pending) {
    if (notification.emailAttemptCount >= MAX_ATTEMPTS) {
      await prisma.notification.updateMany({
        where: { id: notification.id, emailStatus: notification.emailStatus },
        data: { emailStatus: "FAILED", emailLastError: "Maximum delivery attempts reached." },
      });
      continue;
    }

    const claimedAt = new Date();
    const nextAttempt = notification.emailAttemptCount + 1;
    const claimed = await prisma.notification.updateMany({
      where: {
        id: notification.id,
        emailStatus: notification.emailStatus,
        emailLastAttemptAt: notification.emailLastAttemptAt,
      },
      data: { emailStatus: "SENDING", emailAttemptCount: nextAttempt, emailLastAttemptAt: claimedAt, emailLastError: null },
    });
    if (!claimed.count) continue;

    try {
      await sendResendEmail(notification.user.email, notification.title, notification.message, notification.id);
      await prisma.notification.updateMany({
        where: { id: notification.id, emailStatus: "SENDING" },
        data: { emailStatus: "SENT", emailSentAt: new Date(), emailLastError: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 240) : "Email delivery failed.";
      await prisma.notification.updateMany({
        where: { id: notification.id, emailStatus: "SENDING" },
        data: {
          emailStatus: nextAttempt >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          emailLastError: message,
        },
      });
    }
  }
}
