import { Router } from "express";
import { z } from "zod";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { createBookingRefund, RefundServiceError } from "../services/refundService.js";
import { routeId } from "../utils/routeId.js";

const router = Router();
const refundSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount in naira.").optional(),
  customerNote: z.string().trim().max(500).optional(),
});

router.post("/api/admin/bookings/:id/refunds", requireAdminKey, async (req, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid refund amount in naira and a customer note under 500 characters." });
  try {
    const customerNote = parsed.data.customerNote || "HomeEase booking refund";
    const merchantNote = `HomeEase booking refund for ${routeId(req)}`;
    const refund = await createBookingRefund(routeId(req), parsed.data.amount, customerNote, merchantNote);
    return res.status(202).json(refund);
  } catch (error) {
    if (error instanceof RefundServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to initiate booking refund", error);
    return res.status(500).json({ error: "We couldn't initiate this refund. Check Paystack and refresh the booking before retrying." });
  }
});

export default router;
