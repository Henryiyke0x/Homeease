# Email notifications

HomeEase writes booking updates to the in-app notification feed and an email outbox. When Resend is configured, the backend worker sends customer and professional email updates from that outbox. Delivery retries up to five times, and each notification uses a stable idempotency key. Notifications created before the email outbox was added are skipped to avoid sending old updates after setup.

## Configure Resend

1. Create a Resend account and an API key.
2. Verify the domain you want to send from in Resend.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in `backend/.env`. Use a sender on the verified domain, for example `HomeEase <notifications@your-domain.example>`.
4. Set `NOTIFICATION_EMAIL_ENABLED=true` when you are ready to send transactional updates.
5. Restart the backend. The worker checks for queued mail every 15 seconds.

Email remains disabled unless the enable flag, API key and verified sender are all configured. In-app notifications still work while email is disabled, and new emails remain queued.

## Configure SMS with Termii

SMS is a separate outbox and remains disabled until `NOTIFICATION_SMS_ENABLED=true`, `TERMII_API_KEY`, `TERMII_BASE_URL` and `TERMII_SENDER_ID` are set in `backend/.env`. Termii assigns the base URL per account; copy it from the Termii dashboard. The sender ID must be approved by Termii. HomeEase sends booking updates on Termii's DND transactional route, which must be activated for the account. Nigerian local `0...` numbers are converted to `234...`; international numbers are passed through in digits-only form. Missing or unrecognized phone numbers are skipped. Delivery retries up to five times; existing notifications are skipped by the migration so enabling SMS will not send an old backlog.

The API accepts international phone numbers and supports the DND route for transactional messages. Termii notes DND sending must be enabled on the account, so verify that setup before enabling this worker: [Messaging API](https://developers.termii.com/messaging-api).

SMS can incur provider charges. Keep `NOTIFICATION_SMS_ENABLED=false` until the Termii account, sender ID, route and intended recipients are ready. The worker does not send a test message automatically.
