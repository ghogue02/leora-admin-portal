-- CreateTable
CREATE TABLE IF NOT EXISTS "GeocodingCache" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodingCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeocodingCache_address_key" ON "GeocodingCache"("address");

-- CreateIndex
CREATE INDEX "GeocodingCache_cachedAt_idx" ON "GeocodingCache"("cachedAt");
