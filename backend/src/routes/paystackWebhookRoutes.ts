import { Router, raw } from "express";
import { processPaystackWebhook, verifyPaystackWebhookSignature } from "../services/paymentService.js";

const router = Router();

router.post("/api/payments/webhook", raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body)) return res.status(400).json({ error: "Expected a JSON request body." });
  if (!verifyPaystackWebhookSignature(req.body, req.get("paystack-signature"), req.get("x-paystack-signature"))) {
    return res.status(401).json({ error: "Invalid payment webhook signature." });
  }

  try {
    const event: unknown = JSON.parse(req.body.toString("utf8"));
    await processPaystackWebhook(event);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Failed to process Paystack webhook", error);
    return res.status(500).json({ error: "Payment webhook processing failed." });
  }
});

export default router;
