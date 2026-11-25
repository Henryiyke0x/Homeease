# HomeEase

Managed home-services platform.

## Stack
- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma ORM

## Structure
- `frontend/`: public website and customer, professional, and admin interfaces
- `backend/`: Express REST API and Prisma schema
- `docs/`: product, API, and database documentation

## Setup
Install dependencies separately inside `frontend/` and `backend/` using `npm install`.
Copy each `.env.example` to `.env` and configure local values before running services.
For the backend, set `DATABASE_URL` and a private `ADMIN_API_KEY`, start PostgreSQL, then run `npm run db:generate` followed by `npm run db:migrate` to create the database tables, including customer accounts, saved addresses, service catalog, bookings, assignments, booking requests and professional applications. Add active services and prices at `/admin/services` and approve professionals at `/admin/professionals` before confirming and assigning requests. Customer pages are at `/account` and `/customer`; admin pages are at `/admin`, `/admin/services`, `/admin/bookings` and `/admin/professionals`; professional jobs are at `/professional/jobs`.
