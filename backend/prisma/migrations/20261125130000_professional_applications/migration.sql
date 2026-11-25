CREATE TYPE "ProfessionalApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'DECLINED');

CREATE TABLE "ProfessionalApplication" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "services" TEXT[] NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "about" TEXT NOT NULL,
    "status" "ProfessionalApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalApplication_pkey" PRIMARY KEY ("id")
);
