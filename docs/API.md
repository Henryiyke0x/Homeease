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
- `GET /customer/addresses` — lists the signed-in customer's saved addresses.
- `POST /customer/addresses` — saves an address to the signed-in customer's address book.
- `DELETE /customer/addresses/:id` — removes an address owned by the signed-in customer.
- `POST /booking-requests` — validates and stores a customer service request for an active catalog service. Requires `service`, `details`, `date` (`YYYY-MM-DD`), `time`, `address`, `contactName` and `phone`. Associates it with the signed-in customer when a valid session is present, can reference a saved address, and snapshots the current base price; guest requests remain unlinked.
- `GET /admin/booking-requests` — lists requests for admins.
- `PATCH /admin/booking-requests/:id` — marks an open request as `REVIEWING`, `CONTACTED`, `DECLINED` or `CANCELLED`.
- `POST /admin/booking-requests/:id/confirm` — confirms an open request by creating a booking at the recorded base price and the start of the requested time window.
- `GET /admin/bookings` — lists confirmed bookings and current assignments.
- `GET /admin/available-professionals` — lists approved professionals for assignment.
- `POST /admin/bookings/:id/assign` — assigns or reassigns a booking to an approved professional offering that service.
- `POST /admin/bookings/:id/cancel` — cancels a confirmed, assigned or in-progress booking.
- `POST /professional-applications` — receives a professional application and creates a pending professional account.
- `GET /admin/professional-applications` — lists professional applications for admins.
- `PATCH /admin/professional-applications/:id` — updates an application to `PENDING`, `REVIEWING`, `APPROVED` or `DECLINED`.
- `GET /professional/jobs` — lists jobs assigned to the signed-in approved professional.
- `PATCH /professional/jobs/:id/status` — moves an assigned job to `IN_PROGRESS` or an in-progress job to `COMPLETED`.

Admin endpoints require the `x-admin-key` header to match `ADMIN_API_KEY` in the backend environment. Keep this key private and serve the API over HTTPS outside local development.

Customer auth uses an HTTP-only, same-site session cookie. Passwords are stored as scrypt hashes. The frontend API client sends credentials so the cookie can be used across the local frontend and API origins.

## Planned endpoints
- Auth: `POST /auth/refresh`
- Users: `GET /users/me`, `PATCH /users/me`
- Services: `GET /services/:slug`
- Addresses: `GET /addresses`, `POST /addresses`
- Bookings: customer-specific booking detail endpoint
- Professionals: professional availability and earnings endpoints
- Admin: professional availability management
- Payments: `POST /payments/initialize`, `POST /payments/webhook`

Booking confirmation, assignment, professional job status transitions and admin cancellation are implemented. Payment collection, automated notifications, customer cancellation after confirmation, and configurable exact appointment times remain outstanding.
