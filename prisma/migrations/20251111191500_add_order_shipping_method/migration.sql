ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingMethod" text;
