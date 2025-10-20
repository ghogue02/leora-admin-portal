-- Migration: Add SalesSession Table
-- Date: 2025-10-18
-- Description: Creates database-backed session storage for sales reps
--              to persist sessions across server restarts

-- Create SalesSession table
CREATE TABLE IF NOT EXISTS "SalesSession" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "SalesSession_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "SalesSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "SalesSession_refreshToken_key"
  ON "SalesSession"("refreshToken");

CREATE INDEX IF NOT EXISTS "SalesSession_tenantId_idx"
  ON "SalesSession"("tenantId");

CREATE INDEX IF NOT EXISTS "SalesSession_userId_idx"
  ON "SalesSession"("userId");

-- Clean up expired sessions (optional - run periodically)
-- DELETE FROM "SalesSession" WHERE "expiresAt" < NOW();
