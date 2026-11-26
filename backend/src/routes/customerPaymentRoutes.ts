import { Router } from "express";
import { z } from "zod";
import { getSessionUser } from "../services/sessionService.js";
import { initializeBookingPayment, PaymentServiceError, verifyCustomerPayment } from "../services/paymentService.js";
import { routeId } from "../utils/routeId.js";

const router = Router();

router.post("/api/customer/bookings/:id/payment/initialize", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to pay for a booking." });
    return res.json(await initializeBookingPayment(routeId(req), user.id));
  } catch (error) {
    if (error instanceof PaymentServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to initialize customer payment", error);
    return res.status(500).json({ error: "We couldn't start checkout. Please try again." });
  }
});

router.post("/api/customer/payments/verify", async (req, res) => {
  const parsed = z.object({ reference: z.string().trim().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid payment reference is required." });
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to verify this payment." });
    return res.json(await verifyCustomerPayment(parsed.data.reference, user.id));
  } catch (error) {
    if (error instanceof PaymentServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to verify customer payment", error);
    return res.status(500).json({ error: "We couldn't verify this payment. Please try again." });
  }
});

export default router;
