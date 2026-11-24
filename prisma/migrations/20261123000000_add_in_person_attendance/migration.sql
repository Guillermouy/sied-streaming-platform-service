-- CreateEnum
CREATE TYPE "EventModality" AS ENUM ('ONLINE', 'PRESENCIAL', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('ONLINE', 'PRESENCIAL');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "modality" "EventModality" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "venueAddress" TEXT,
ADD COLUMN     "venueName" TEXT;

-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "checkInCode" TEXT;

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_registrationId_day_key" ON "check_ins"("registrationId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_checkInCode_key" ON "event_registrations"("checkInCode");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

