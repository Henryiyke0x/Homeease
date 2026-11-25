# Database design

PostgreSQL is the primary relational database. Prisma manages schema migrations and generated client access.

## Initial models
User, Service, Address, Booking, Assignment and Payment.

`CustomerSession` stores only a hash of each customer session token with its expiry time. Deleting a user cascades to their sessions.

`Address` stores a customer's saved service locations and access instructions. Booking requests keep an address snapshot and an optional link to the saved address used, so later edits do not rewrite historical request details.

`BookingRequest` stores service inquiries from the public booking form, including the requested service, task details, preferred date and time, address and contact details. When the customer is signed in, the request links to their `User` record; guest requests have no customer link. It stores links to the selected service and address plus snapshots of the service name, base price and address. Its status moves through `NEW`, `REVIEWING`, `CONTACTED`, `ACCEPTED`, `DECLINED` or `CANCELLED`. Customers can cancel their own requests while they are `NEW` or `REVIEWING`. It is separate from `Booking`, which represents a request accepted into the managed booking lifecycle.

Confirming a request creates exactly one `Booking`, snapshots the customer contact and service address, and sets the booking to `CONFIRMED` at the start of the selected time window. Assignment links the booking to one approved professional and advances it to `ASSIGNED`. The assigned professional may advance it to `IN_PROGRESS` and then `COMPLETED`.

`ProfessionalApplication` stores applicants' contact details, service areas, experience and selected service types. Applications can be reviewed, approved or declined by an admin.

`Service` is the admin-managed catalog of active service types and NGN base prices. Booking requests reference the selected catalog row while retaining the submitted service name and base-price snapshot as historical values.

## Planned models
CustomerProfile, ProfessionalProfile, ProfessionalApplication, BookingItem, Subscription, Review, Notification, Message, Dispute, Payout and AuditLog.

## Important rules
- Store money using fixed-precision decimals and persist currency.
- Verify payment webhooks server-side.
- Enforce ownership and role permissions on protected resources.
- Use database transactions for booking and payment state transitions.
