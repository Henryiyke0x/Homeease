DROP INDEX "Assignment_bookingId_idx";

CREATE UNIQUE INDEX "Assignment_bookingId_key" ON "Assignment"("bookingId");
