ALTER TABLE "Booking"
    ALTER COLUMN "customerId" DROP NOT NULL,
    ALTER COLUMN "addressId" DROP NOT NULL;

ALTER TABLE "Booking"
    ADD COLUMN "sourceRequestId" TEXT,
    ADD COLUMN "contactName" TEXT,
    ADD COLUMN "contactPhone" TEXT,
    ADD COLUMN "serviceAddress" TEXT,
    ADD COLUMN "addressInstructions" TEXT;

UPDATE "Booking"
SET "contactName" = 'Customer',
    "contactPhone" = '',
    "serviceAddress" = 'Address not recorded';

UPDATE "Booking" AS b
SET "contactName" = u."firstName" || ' ' || u."lastName",
    "contactPhone" = COALESCE(u."phone", '')
FROM "User" AS u
WHERE u."id" = b."customerId";

UPDATE "Booking" AS b
SET "serviceAddress" = a."line1" || ', ' || a."city" || ', ' || a."state",
    "addressInstructions" = a."instructions"
FROM "Address" AS a
WHERE a."id" = b."addressId";

ALTER TABLE "Booking"
    ALTER COLUMN "contactName" SET NOT NULL,
    ALTER COLUMN "contactPhone" SET NOT NULL,
    ALTER COLUMN "serviceAddress" SET NOT NULL;

CREATE UNIQUE INDEX "Booking_sourceRequestId_key" ON "Booking"("sourceRequestId");

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_sourceRequestId_fkey"
    FOREIGN KEY ("sourceRequestId") REFERENCES "BookingRequest"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfessionalApplication"
    ADD COLUMN "userId" TEXT;

UPDATE "ProfessionalApplication" AS pa
SET "userId" = u."id"
FROM "User" AS u
WHERE LOWER(pa."email") = LOWER(u."email") AND u."role" = 'PROFESSIONAL';

CREATE UNIQUE INDEX "ProfessionalApplication_userId_key" ON "ProfessionalApplication"("userId");

ALTER TABLE "ProfessionalApplication"
    ADD CONSTRAINT "ProfessionalApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
