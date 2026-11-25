CREATE TYPE "BookingRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'ACCEPTED', 'DECLINED');

ALTER TABLE "BookingRequest"
    ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "BookingRequest"
    ALTER COLUMN "status" TYPE "BookingRequestStatus"
    USING "status"::"BookingRequestStatus";

ALTER TABLE "BookingRequest"
    ALTER COLUMN "status" SET DEFAULT 'NEW';
