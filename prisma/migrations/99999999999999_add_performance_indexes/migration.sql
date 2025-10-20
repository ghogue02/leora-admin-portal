-- Add performance indexes for frequently queried fields

-- Customer indexes for search and filtering
CREATE INDEX IF NOT EXISTS "Customer_billingEmail_idx" ON "Customer"("billingEmail");
-- Note: accountName column doesn't exist in schema, skipping
-- CREATE INDEX IF NOT EXISTS "Customer_accountName_idx" ON "Customer"("accountName");
CREATE INDEX IF NOT EXISTS "Customer_accountNumber_idx" ON "Customer"("accountNumber");

-- Order indexes for filtering by status and date
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_orderedAt_idx" ON "Order"("orderedAt");
CREATE INDEX IF NOT EXISTS "Order_customerId_status_idx" ON "Order"("customerId", "status");

-- Inventory indexes for location-based queries
CREATE INDEX IF NOT EXISTS "Inventory_skuId_idx" ON "Inventory"("skuId");
CREATE INDEX IF NOT EXISTS "Inventory_location_idx" ON "Inventory"("location");
CREATE INDEX IF NOT EXISTS "Inventory_skuId_location_idx" ON "Inventory"("skuId", "location");

-- User indexes for authentication and search
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "User_tenantId_isActive_idx" ON "User"("tenantId", "isActive");

-- PortalUser indexes for search
CREATE INDEX IF NOT EXISTS "PortalUser_email_idx" ON "PortalUser"("email");
CREATE INDEX IF NOT EXISTS "PortalUser_status_idx" ON "PortalUser"("status");
CREATE INDEX IF NOT EXISTS "PortalUser_customerId_idx" ON "PortalUser"("customerId");

-- Sku indexes for product search
-- Note: Sku table uses 'code' not 'skuId', and may not have 'description'
CREATE INDEX IF NOT EXISTS "Sku_code_idx" ON "Sku"("code");
-- CREATE INDEX IF NOT EXISTS "Sku_description_idx" ON "Sku"("description");

-- Activity indexes for timeline queries
CREATE INDEX IF NOT EXISTS "Activity_customerId_idx" ON "Activity"("customerId");
CREATE INDEX IF NOT EXISTS "Activity_activityDate_idx" ON "Activity"("activityDate");
CREATE INDEX IF NOT EXISTS "Activity_customerId_activityDate_idx" ON "Activity"("customerId", "activityDate");

-- SalesRep indexes for assignment queries
CREATE INDEX IF NOT EXISTS "SalesRep_userId_idx" ON "SalesRep"("userId");
CREATE INDEX IF NOT EXISTS "SalesRep_isActive_idx" ON "SalesRep"("isActive");
CREATE INDEX IF NOT EXISTS "SalesRep_tenantId_isActive_idx" ON "SalesRep"("tenantId", "isActive");

-- Invoice indexes for payment tracking
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_isPaid_idx" ON "Invoice"("isPaid");

-- CalendarEvent indexes for scheduling
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_startTime_idx" ON "CalendarEvent"("userId", "startTime");

-- Task indexes for task management
CREATE INDEX IF NOT EXISTS "Task_assignedToId_idx" ON "Task"("assignedToId");
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX IF NOT EXISTS "Task_assignedToId_status_idx" ON "Task"("assignedToId", "status");
