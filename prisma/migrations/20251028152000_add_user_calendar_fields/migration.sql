-- Add calendar sync fields to User table
ALTER TABLE "User"
ADD COLUMN "calendarProvider" TEXT,
ADD COLUMN "calendarAccessToken" TEXT,
ADD COLUMN "calendarRefreshToken" TEXT,
ADD COLUMN "lastCalendarSync" TIMESTAMP(3);
