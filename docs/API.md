# API outline

Base URL: `/api`

## Implemented
- `GET /health` — API health check.
- `GET /services` — lists active services and current base prices for customers.
- `GET /admin/services` — lists the full service catalog for admins.
- `POST /admin/services` — creates a service with an NGN base price.
- `PATCH /admin/services/:id` — updates a service or hides it from new requests.
- `POST /auth/register` — creates a customer account and starts a session.
- `POST /auth/login` — signs in and starts a session.
- `GET /auth/me` — returns the current customer session.
- `POST /auth/logout` — ends the current session.
- `GET /customer/booking-requests` — lists the signed-in customer's own requests and statuses.
- `POST /customer/booking-requests/:id/cancel` — cancels an owned request while its status is `NEW`, `REVIEWING` or `CONTACTED`.
- `POST /customer/bookings/:id/cancel` — cancels an owned booking while it is `CONFIRMED` or `ASSIGNED`. Customers must contact support once work is in progress.
- `PATCH /customer/bookings/:id/reschedule` — updates an owned `CONFIRMED` or `ASSIGNED` booking to a future date and exact hourly start time (`08:00`–`18:00`, Lagos time).
- `POST /customer/bookings/:id/payment/initialize` — initializes Paystack checkout for an owned confirmed or assigned booking using its server-stored total.
- `POST /customer/payments/verify` — verifies an owned payment reference with Paystack and checks status, amount and NGN currency before marking it paid.
- `POST /admin/bookings/:id/refunds` — initiates a full or partial refund for a successful Paystack payment; provide `amount` in naira to refund partially, or omit it to refund the remaining balance. Refund status is reconciled from Paystack webhooks.
- `POST /payments/webhook` — validates Paystack webhook signatures and verifies successful events server-to-server before updating payment status.
- `GET /notifications` — lists the signed-in customer's or professional's latest 50 booking updates.
- `PATCH /notifications/:id/read` — marks one of the signed-in user's notifications as read.
- `GET /reviews` — lists up to six publicly approved customer reviews.
- `POST /customer/bookings/:id/reviews` — submits one rating and review for a completed booking owned by the signed-in customer; reviews are hidden until an admin publishes them.
- `GET /admin/reviews` — lists all reviews for moderation.
- `PATCH /admin/reviews/:id` — sets a review to `PENDING`, `PUBLISHED` or `HIDDEN`.
- `GET /customer/addresses` — lists the signed-in customer's saved addresses.
- `POST /customer/addresses` — saves an address to the signed-in customer's address book.
- `DELETE /customer/addresses/:id` — removes an address owned by the signed-in customer.
- `POST /booking-requests` — validates and stores a customer service request for an active catalog service. Requires `service`, `details`, `date` (`YYYY-MM-DD`), `time` (hourly start time `08:00`–`18:00`, Lagos time), `address`, `contactName` and `phone`. Associates it with the signed-in customer when a valid session is present, can reference a saved address, and snapshots the current base price; guest requests remain unlinked.
- `GET /admin/booking-requests` — lists requests for admins.
- `PATCH /admin/booking-requests/:id` — marks an open request as `REVIEWING`, `CONTACTED`, `DECLINED` or `CANCELLED`.
- `POST /admin/booking-requests/:id/confirm` — confirms an open request by creating a booking at the recorded base price and appointment time.
- `GET /admin/bookings` — lists confirmed bookings and current assignments.
- `GET /admin/available-professionals` — lists approved professionals for assignment.
- `GET /admin/available-professionals?bookingId=:id` — filters approved professionals to those who offer that service, work that weekday/start time, and have no other active booking in the same hourly slot.
- `POST /admin/bookings/:id/assign` — assigns or reassigns a booking to an approved professional offering that service.
- `POST /admin/bookings/:id/cancel` — cancels a confirmed, assigned or in-progress booking.
- `POST /professional-applications` — receives a professional application and creates a pending professional account.
- `GET /admin/professional-applications` — lists professional applications for admins.
- `PATCH /admin/professional-applications/:id` — updates an application to `PENDING`, `REVIEWING`, `APPROVED` or `DECLINED`.
- `GET /professional/jobs` — lists jobs assigned to the signed-in approved professional.
- `PATCH /professional/jobs/:id/status` — moves an assigned job to `IN_PROGRESS` or an in-progress job to `COMPLETED`.
- `GET /professional/availability` — returns the signed-in approved professional's weekly available start times.
- `PUT /professional/availability` — replaces the professional's weekly availability with hourly starts from `08:00` to `18:00` Lagos time.

Admin endpoints require the `x-admin-key` header to match `ADMIN_API_KEY` in the backend environment. Keep this key private and serve the API over HTTPS outside local development. Online checkout requires `PAYSTACK_SECRET_KEY`; webhook delivery additionally requires `PAYSTACK_WEBHOOK_SECRET` (or the Paystack legacy signature via the secret key). Email delivery requires `NOTIFICATION_EMAIL_ENABLED=true`, `RESEND_API_KEY` and an `EMAIL_FROM` sender on a verified domain. SMS delivery requires `NOTIFICATION_SMS_ENABLED=true` and the Termii account key, base URL and sender ID. Keep provider credentials only in the backend environment.

Customer auth uses an HTTP-only, same-site session cookie. Passwords are stored as scrypt hashes. The frontend API client sends credentials so the cookie can be used across the local frontend and API origins.

## Planned endpoints
- Auth: `POST /auth/refresh`
- Users: `GET /users/me`, `PATCH /users/me`
- Services: `GET /services/:slug`
- Addresses: `GET /addresses`, `POST /addresses`
- Bookings: customer-specific booking detail endpoint
- Professionals: professional earnings endpoint

Booking confirmation, assignment, professional job status transitions, admin cancellation, customer cancellation before work starts, hourly appointment selection, professional weekly availability, in-app notifications, queued email and SMS delivery, Paystack checkout/verification/refunds, and moderated customer reviews are implemented. Appointment starts currently run hourly from 08:00 to 18:00 Lagos time; service duration and operating hours are not admin-configurable yet. Assignment requires a verified successful payment and a matching professional availability slot. Paystack needs valid test or live keys, and webhook events need a publicly reachable HTTPS API URL.
