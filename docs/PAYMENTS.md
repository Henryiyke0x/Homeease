# Paystack setup

HomeEase uses Paystack's hosted checkout. The backend initializes each transaction from the confirmed booking amount, and verifies the transaction reference, status, amount and currency before marking the booking payment as successful.

## Local test setup

1. Create or open a Paystack account and copy the **test secret key** from the Paystack dashboard.
2. Add it to `backend/.env` as `PAYSTACK_SECRET_KEY=sk_test_...`. Keep it out of frontend environment files and source control.
3. Restart the backend. Sign in to HomeEase, make a booking request, and have an admin confirm it. The booking history will show **Pay now**.
4. The customer is redirected to Paystack's hosted checkout. Paystack returns the browser to `/account/payment/callback`, where HomeEase verifies the reference server-side.
5. After payment is verified, the admin can assign the booking to a professional. The assignment API rejects unpaid bookings.

## Webhooks

Set the Paystack webhook URL to `https://<public-api-host>/api/payments/webhook` and put the dashboard's webhook signing secret in `backend/.env` as `PAYSTACK_WEBHOOK_SECRET=whsec_...`. Restart the backend after changing environment variables. Paystack cannot send webhook events to `localhost`; use a public HTTPS tunnel for local webhook development. The checkout callback still performs server-side verification when no local webhook can reach the machine.

Never use live keys for local development. Keep all Paystack secrets on the backend and use test credentials until the live integration is deliberately configured.

## Refunds

An admin can open **Confirmed bookings**, enter an optional partial amount in naira, then request the refund. Leaving the amount blank requests the remaining refundable balance. The page displays refund records and their current states. Paystack can report pending, processing, needs-attention, failed or processed states; HomeEase updates those states from signed webhook events. A transport timeout is held for admin review rather than automatically retried, since the provider may have accepted the request. Check the Paystack dashboard before taking further action in that case.

Configure `PAYSTACK_WEBHOOK_SECRET` and a publicly reachable HTTPS webhook URL at `/api/payments/webhook` to receive refund updates. Paystack notes that processed refunds can still take several business days to appear in a customer's account. See [Paystack's refund guide](https://docs-v2.paystack.com/payments/refunds/) and [Refund API](https://paystack.com/docs/api/refund/).
