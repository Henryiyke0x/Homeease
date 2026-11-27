CREATE TABLE "ProfessionalAvailability" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "availableTimes" TEXT[] NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalAvailability_professionalId_dayOfWeek_key"
  ON "ProfessionalAvailability"("professionalId", "dayOfWeek");
CREATE INDEX "ProfessionalAvailability_dayOfWeek_idx"
  ON "ProfessionalAvailability"("dayOfWeek");

ALTER TABLE "ProfessionalAvailability" ADD CONSTRAINT "ProfessionalAvailability_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
