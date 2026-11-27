# Database design

PostgreSQL is the primary relational database. Prisma manages schema migrations and generated client access.

## Initial models
User, Service, Address, Booking, Assignment and Payment.

`CustomerSession` stores only a hash of each customer session token with its expiry time. Deleting a user cascades to their sessions.

`Address` stores a customer's saved service locations and access instructions. Booking requests keep an address snapshot and an optional link to the saved address used, so later edits do not rewrite historical request details.

`BookingRequest` stores service inquiries from the public booking form, including the requested service, task details, preferred date and time, address and contact details. When the customer is signed in, the request links to their `User` record; guest requests have no customer link. It stores links to the selected service and address plus snapshots of the service name, base price and address. Its status moves through `NEW`, `REVIEWING`, `CONTACTED`, `ACCEPTED`, `DECLINED` or `CANCELLED`. Customers can cancel their own requests while they are `NEW` or `REVIEWING`. It is separate from `Booking`, which represents a request accepted into the managed booking lifecycle.

Confirming a request creates exactly one `Booking`, snapshots the customer contact and service address, and sets the booking to `CONFIRMED` at its selected appointment time. New requests use hourly starts from 08:00 to 18:00 Lagos time; legacy requests retain their original time-window labels. Assignment links the booking to one approved professional and advances it to `ASSIGNED`. The assigned professional may advance it to `IN_PROGRESS` and then `COMPLETED`.

`ProfessionalApplication` stores applicants' contact details, service areas, experience and selected service types. Applications can be reviewed, approved or declined by an admin.

`ProfessionalAvailability` stores a professional's weekly available appointment start times in Lagos time, one row per weekday. A professional can update this schedule from the jobs portal. Admin assignment candidates are filtered against the booking's service, weekday and exact start time; the assignment service also checks that the professional has no other active booking at the same slot.

`Service` is the admin-managed catalog of active service types and NGN base prices. Booking requests reference the selected catalog row while retaining the submitted service name and base-price snapshot as historical values.

`Payment` stores Paystack transaction attempts, including a unique provider reference, checkout URL, NGN amount and current status. The service reuses a pending checkout on repeat requests. Success is recorded only after the server verifies the provider reference, transaction status, amount and currency.

`Refund` stores full or partial refund requests tied to a successful `Payment`, including a stable provider reference, amount, status and notes. Refund status moves through the provider's pending/processing states to processed or failed. A payment remains blocked from another checkout while refunds are pending and after any refund is issued.

`Review` stores one rating and written review per completed booking. The customer supplies a public display name; reviews default to `PENDING` and appear in the public API only after an administrator publishes them. Hiding a review removes it from the homepage feed without deleting its moderation record.

`Notification` stores customer and professional booking updates plus email and SMS outbox states. State transitions create notifications in the same database transaction as the booking change. Each user can mark their own notifications as read; deleting a user or related booking/request removes its notifications. Delivery attempt metadata is internal and is not exposed through the user API. Existing notifications are skipped in each channel's outbox migration so enabling a provider does not send stale updates.

## Planned models
CustomerProfile, ProfessionalProfile, BookingItem, Subscription, Message, Dispute, Payout and AuditLog.

## Important rules
- Store money using fixed-precision decimals and persist currency.
- Verify payment webhooks server-side.
- Enforce ownership and role permissions on protected resources.
- Use database transactions for booking and payment state transitions.
