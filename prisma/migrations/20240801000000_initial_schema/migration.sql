-- Ensure extensions schema exists for uuid-ossp availability
CREATE SCHEMA IF NOT EXISTS "extensions";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- CreateEnum
CREATE TYPE "AzugaIntegrationStatus" AS ENUM ('PENDING', 'DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "AzugaAuthType" AS ENUM ('CREDENTIALS', 'API_KEY');

-- CreateEnum
CREATE TYPE "ProductFieldScope" AS ENUM ('PRODUCT', 'SKU', 'PRICING', 'INVENTORY', 'SALES');

-- CreateEnum
CREATE TYPE "ProductFieldInputType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE', 'RICH_TEXT');

-- CreateEnum
CREATE TYPE "ProductLifecycleStatus" AS ENUM ('CORE', 'NEW', 'PROMO', 'CLOSEOUT');

-- CreateEnum
CREATE TYPE "InvoiceFormatType" AS ENUM ('STANDARD', 'VA_ABC_INSTATE', 'VA_ABC_TAX_EXEMPT');

-- CreateEnum
CREATE TYPE "PortalUserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'FULFILLED', 'CANCELLED', 'PARTIALLY_FULFILLED', 'PENDING', 'READY_TO_DELIVER', 'PICKED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "OrderUsageType" AS ENUM ('BTG', 'WINE_CLUB', 'SUPPLIER_EVENT', 'OTHER_ONE_OFF');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "HealthPingStatus" AS ENUM ('UP', 'DOWN', 'DEGRADED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "CustomerRiskStatus" AS ENUM ('HEALTHY', 'AT_RISK_CADENCE', 'AT_RISK_REVENUE', 'DORMANT', 'CLOSED', 'PROSPECT', 'PROSPECT_COLD', 'UNQUALIFIED');

-- CreateEnum
CREATE TYPE "CustomerDuplicateStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PriceListJurisdictionType" AS ENUM ('GLOBAL', 'STATE', 'FEDERAL_PROPERTY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ACTIVE', 'TARGET', 'PROSPECT', 'HOLD');

-- CreateEnum
CREATE TYPE "AccountPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CallPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContactOutcome" AS ENUM ('NOT_ATTEMPTED', 'NO_CONTACT', 'CONTACTED', 'VISITED', 'LEFT_MESSAGE', 'SPOKE_WITH_CONTACT', 'IN_PERSON_VISIT', 'EMAIL_SENT', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('SAMPLE_NO_ORDER', 'FIRST_ORDER_FOLLOWUP', 'CUSTOMER_TIMING', 'BURN_RATE_ALERT');

-- CreateEnum
CREATE TYPE "PickSheetStatus" AS ENUM ('DRAFT', 'READY', 'PICKING', 'PICKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'PICKED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "ReplayRunStatus" AS ENUM ('COMPLETED', 'FAILED', 'RUNNING');

-- CreateEnum
CREATE TYPE "ScheduledReportType" AS ENUM ('DAILY_BRIEFING', 'WEEKLY_PERFORMANCE', 'TERRITORY_HEALTH', 'CUSTOM_QUERY');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "SMSDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "SMSStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "SageExportStatus" AS ENUM ('PENDING', 'VALIDATING', 'EXPORTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SageErrorType" AS ENUM ('MISSING_CUSTOMER', 'MISSING_SKU', 'MISSING_SALES_REP', 'INVALID_AMOUNT', 'INVALID_DATE', 'INVALID_PAYMENT_TERMS', 'DUPLICATE_INVOICE', 'VALIDATION_FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wholesalerLicenseNumber" TEXT,
    "wholesalerPhone" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "defaultPortalRole" TEXT NOT NULL DEFAULT 'portal.viewer',
    "revenueDropAlertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "sampleAllowancePerMonth" INTEGER NOT NULL DEFAULT 60,
    "minimumOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 200.00,
    "minimumOrderEnforcementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calendarProvider" TEXT,
    "calendarAccessToken" TEXT,
    "calendarRefreshToken" TEXT,
    "lastCalendarSync" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "portalUserKey" TEXT,
    "status" "PortalUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUserRole" (
    "portalUserId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "PortalUserRole_pkey" PRIMARY KEY ("portalUserId","roleId")
);

-- CreateTable
CREATE TABLE "PortalSession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "portalUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supplierId" UUID,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isSampleOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tastingNotes" JSONB,
    "foodPairings" JSONB,
    "servingInfo" JSONB,
    "wineDetails" JSONB,
    "enrichedAt" TIMESTAMP(3),
    "enrichedBy" TEXT DEFAULT 'claude-ai',
    "isPromotion" BOOLEAN NOT NULL DEFAULT false,
    "promotionStartDate" TIMESTAMP(6),
    "promotionEndDate" TIMESTAMP(6),
    "promotionDiscount" DECIMAL(5,2),
    "isCloseout" BOOLEAN NOT NULL DEFAULT false,
    "vintage" INTEGER,
    "colour" TEXT,
    "varieties" TEXT,
    "style" TEXT,
    "unitCogs" DECIMAL(10,4),
    "manufacturer" TEXT,
    "abcCode" TEXT,
    "mocoNumber" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFieldDefinition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT,
    "scope" "ProductFieldScope" NOT NULL DEFAULT 'PRODUCT',
    "inputType" "ProductFieldInputType" NOT NULL DEFAULT 'TEXT',
    "supportsManualEntry" BOOLEAN NOT NULL DEFAULT true,
    "defaultVisibility" BOOLEAN NOT NULL DEFAULT true,
    "defaultRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultDisplayOrder" INTEGER,
    "showInPortalByDefault" BOOLEAN NOT NULL DEFAULT false,
    "filterableByDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFieldOption" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantProductFieldConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "showInPortal" BOOLEAN NOT NULL DEFAULT false,
    "filterable" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProductFieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLifecycleSnapshot" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "status" "ProductLifecycleStatus" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLifecycleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "size" TEXT,
    "unitOfMeasure" TEXT,
    "abv" DOUBLE PRECISION,
    "casesPerPallet" INTEGER,
    "pricePerUnit" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemsPerCase" INTEGER,
    "liters" DECIMAL(10,2),
    "bottleBarcode" TEXT,
    "caseBarcode" TEXT,
    "batchNumber" TEXT,
    "barrelOrTank" TEXT,
    "pendingOrders" INTEGER DEFAULT 0,
    "pendingReceiving" INTEGER DEFAULT 0,
    "abcCodeNumber" TEXT,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aisle" TEXT,
    "row" INTEGER,
    "shelf" TEXT,
    "bin" TEXT,
    "status" "InventoryStatus" DEFAULT 'AVAILABLE',
    "pickOrder" INTEGER,
    "binLocation" TEXT,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jurisdictionType" "PriceListJurisdictionType" NOT NULL DEFAULT 'GLOBAL',
    "jurisdictionValue" TEXT,
    "allowManualOverride" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "billingEmail" TEXT,
    "phone" TEXT,
    "street1" TEXT,
    "street2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "paymentTerms" TEXT DEFAULT 'Net 30',
    "orderingPaceDays" INTEGER,
    "establishedRevenue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "averageOrderIntervalDays" INTEGER,
    "licenseNumber" TEXT,
    "closedReason" TEXT,
    "dormancySince" TIMESTAMP(3),
    "isPermanentlyClosed" BOOLEAN NOT NULL DEFAULT false,
    "lastOrderDate" TIMESTAMP(3),
    "nextExpectedOrderDate" TIMESTAMP(3),
    "reactivatedDate" TIMESTAMP(3),
    "riskStatus" "CustomerRiskStatus" NOT NULL DEFAULT 'HEALTHY',
    "salesRepId" UUID,
    "accountType" "AccountType",
    "accountPriority" "AccountPriority",
    "accountPriorityAutoAssignedAt" TIMESTAMP(3),
    "accountPriorityManuallySet" BOOLEAN NOT NULL DEFAULT false,
    "territory" TEXT,
    "doNotContactUntil" TIMESTAMP(6),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocodedAt" TIMESTAMP(6),
    "buyerFirstName" TEXT,
    "buyerLastName" TEXT,
    "csvImportedAt" TIMESTAMP(3),
    "csvLastSyncedAt" TIMESTAMP(3),
    "quarterlyRevenueTarget" DECIMAL(12,2),
    "licenseType" TEXT,
    "deliveryInstructions" TEXT,
    "deliveryWindows" JSONB,
    "paymentMethod" TEXT,
    "deliveryMethod" TEXT,
    "defaultDeliveryTimeWindow" TEXT,
    "defaultWarehouseLocation" TEXT,
    "website" TEXT,
    "googlePlaceId" TEXT,
    "googlePlaceName" TEXT,
    "googleFormattedAddress" TEXT,
    "internationalPhone" TEXT,
    "googleMapsUrl" TEXT,
    "googleBusinessStatus" TEXT,
    "googlePlaceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresPO" BOOLEAN NOT NULL DEFAULT false,
    "invoiceStateCode" TEXT,
    "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptNumber" TEXT,
    "type" TEXT,
    "volumeCapacity" TEXT,
    "featurePrograms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimumOrderOverride" DECIMAL(10,2),
    "minimumOrderOverrideNotes" TEXT,
    "minimumOrderOverrideUpdatedAt" TIMESTAMP(3),
    "minimumOrderOverrideUpdatedBy" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "portalUserId" UUID,
    "salesRepId" UUID,
    "orderNumber" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "total" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "deliveryWeek" INTEGER,
    "isFirstOrder" BOOLEAN NOT NULL DEFAULT false,
    "pickSheetStatus" TEXT DEFAULT 'not_picked',
    "pickSheetId" UUID,
    "isEventSale" BOOLEAN NOT NULL DEFAULT false,
    "eventType" TEXT,
    "eventNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "deliveryDate" TIMESTAMP(3),
    "deliveryTimeWindow" TEXT,
    "shippingMethod" TEXT,
    "requestedDeliveryDate" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "warehouseLocation" TEXT,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "splitCaseFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "poNumber" TEXT,
    "specialInstructions" TEXT,
    "minimumOrderThreshold" DECIMAL(10,2),
    "minimumOrderViolation" BOOLEAN NOT NULL DEFAULT false,
    "approvalReasons" JSONB,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "appliedPricingRules" JSONB,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "casesQuantity" DECIMAL(10,2),
    "totalLiters" DECIMAL(10,2),
    "priceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overridePrice" DECIMAL(10,2),
    "overrideReason" TEXT,
    "usageType" "OrderUsageType",
    "overriddenBy" TEXT,
    "overriddenAt" TIMESTAMP(3),

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "customerId" UUID,
    "invoiceNumber" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectionTerms" TEXT,
    "complianceNotice" TEXT,
    "interestRate" DECIMAL(5,2),
    "invoiceFormatType" "InvoiceFormatType" DEFAULT 'STANDARD',
    "paymentTermsText" TEXT,
    "poNumber" TEXT,
    "salesperson" TEXT,
    "shipDate" TIMESTAMP(3),
    "shippingMethod" TEXT,
    "specialInstructions" TEXT,
    "totalLiters" DECIMAL(10,2),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "orderId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "portalUserId" UUID NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'primary',
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'United States',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalNotification" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "portalUserId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityType" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "activityTypeId" UUID NOT NULL,
    "userId" UUID,
    "portalUserId" UUID,
    "customerId" UUID,
    "orderId" UUID,
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "followUpAt" TIMESTAMP(3),
    "outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleList" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredPriceListIds" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleListItem" (
    "id" UUID NOT NULL,
    "sampleListId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "notes" TEXT,
    "defaultFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySampleItem" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "sampleListItemId" UUID,
    "feedback" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivitySampleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallPlan" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER,
    "year" INTEGER,
    "status" "CallPlanStatus",
    "targetCount" INTEGER,

    CONSTRAINT "CallPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "callPlanId" UUID,
    "customerId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "planObjective" TEXT,
    "planNotes" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedById" UUID,
    "priority" "TaskPriority" DEFAULT 'MEDIUM',

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountHealthSnapshot" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "revenueScore" INTEGER NOT NULL,
    "cadenceScore" INTEGER NOT NULL,
    "sampleUtilization" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dataType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "templateId" UUID,
    "fileKey" TEXT,
    "checksum" TEXT,
    "initiatedById" UUID,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "externalKey" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errors" JSONB,
    "appliedRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesMetric" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "revenue" DECIMAL(14,2),
    "volume" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceFiling" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceFiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateCompliance" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateTaxRate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "effective" TIMESTAMP(3) NOT NULL,
    "expires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateTaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subscriptionId" UUID,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "webhookEventId" UUID NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationToken" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AzugaIntegrationSettings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "AzugaIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "authType" "AzugaAuthType" NOT NULL DEFAULT 'CREDENTIALS',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "loginUsername" TEXT,
    "encryptedLoginPassword" TEXT,
    "encryptedApiKey" TEXT,
    "encryptedWebhookSecret" TEXT,
    "webhookAuthType" TEXT DEFAULT 'BASIC',
    "webhookUrl" TEXT,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 1,
    "isTelematicsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isRouteExportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isRouteImportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isWebhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastConnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AzugaIntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "territoryName" TEXT NOT NULL,
    "deliveryDay" TEXT,
    "weeklyRevenueQuota" DECIMAL(12,2),
    "monthlyRevenueQuota" DECIMAL(12,2),
    "quarterlyRevenueQuota" DECIMAL(12,2),
    "annualRevenueQuota" DECIMAL(12,2),
    "weeklyCustomerQuota" INTEGER,
    "sampleAllowancePerMonth" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderEntryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDaysArray" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "tastedAt" TIMESTAMP(3) NOT NULL,
    "feedback" TEXT,
    "needsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followedUpAt" TIMESTAMP(3),
    "resultedInOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackOptions" JSONB,
    "customerResponse" TEXT,
    "sampleSource" TEXT,
    "followUpTaskId" UUID,

    CONSTRAINT "SampleUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepWeeklyMetric" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,
    "revenueLastYear" DECIMAL(14,2),
    "uniqueCustomerOrders" INTEGER NOT NULL,
    "newCustomersAdded" INTEGER NOT NULL DEFAULT 0,
    "dormantCustomersCount" INTEGER NOT NULL DEFAULT 0,
    "reactivatedCustomersCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryDaysInWeek" INTEGER NOT NULL DEFAULT 1,
    "inPersonVisits" INTEGER NOT NULL DEFAULT 0,
    "tastingAppointments" INTEGER NOT NULL DEFAULT 0,
    "emailContacts" INTEGER NOT NULL DEFAULT 0,
    "phoneContacts" INTEGER NOT NULL DEFAULT 0,
    "textContacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepWeeklyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepProductGoal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "skuId" UUID,
    "productCategory" TEXT,
    "targetRevenue" DECIMAL(12,2),
    "targetCases" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetPod" INTEGER,
    "metricType" TEXT NOT NULL DEFAULT 'revenue',
    "periodType" TEXT NOT NULL DEFAULT 'month',

    CONSTRAINT "RepProductGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopProduct" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(14,2) NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "uniqueCustomers" INTEGER NOT NULL,
    "rankingType" TEXT NOT NULL,

    CONSTRAINT "TopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesIncentive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "targetSkuId" UUID,
    "targetCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT,
    "customerId" UUID,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callPlanAccountId" UUID,
    "externalEventId" TEXT,
    "syncedAt" TIMESTAMP(6),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRunLog" (
    "id" UUID NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'RUNNING',
    "environment" TEXT,
    "tenantSlug" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthPingLog" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "targetTenant" TEXT,
    "status" "HealthPingStatus" NOT NULL DEFAULT 'UP',
    "statusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "acknowledgedByName" TEXT,

    CONSTRAINT "HealthPingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataIntegritySnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalIssues" INTEGER NOT NULL,
    "criticalIssues" INTEGER NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "issuesByRule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataIntegritySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallPlanAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "objective" TEXT,
    "addedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactOutcome" "ContactOutcome" NOT NULL DEFAULT 'NOT_ATTEMPTED',
    "contactedAt" TIMESTAMP(6),
    "notes" TEXT,

    CONSTRAINT "CallPlanAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallPlanActivity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "activityTypeId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(6) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallPlanActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallPlanSchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "googleEventId" TEXT,
    "outlookEventId" TEXT,

    CONSTRAINT "CallPlanSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryBlock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "territory" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringCallPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "preferredTime" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringCallPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "calendarId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedTrigger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomatedTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggeredTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "triggerId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "triggeredAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "TriggeredTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleFeedbackTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleFeedbackTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleMetrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "periodStart" TIMESTAMP(6) NOT NULL,
    "periodEnd" TIMESTAMP(6) NOT NULL,
    "totalSamplesGiven" INTEGER DEFAULT 0,
    "totalCustomersSampled" INTEGER DEFAULT 0,
    "samplesResultingInOrder" INTEGER DEFAULT 0,
    "conversionRate" DOUBLE PRECISION DEFAULT 0,
    "totalRevenue" DECIMAL(12,2),
    "avgRevenuePerSample" DECIMAL(12,2),
    "calculatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "aisleCount" INTEGER DEFAULT 10,
    "rowsPerAisle" INTEGER DEFAULT 20,
    "shelfLevels" TEXT[] DEFAULT ARRAY['Top', 'Middle', 'Bottom']::TEXT[],
    "pickStrategy" TEXT DEFAULT 'aisle_then_row',
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickSheet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "sheetNumber" TEXT NOT NULL,
    "status" "PickSheetStatus" DEFAULT 'DRAFT',
    "pickerName" TEXT,
    "createdById" UUID NOT NULL,
    "startedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickSheetItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "pickSheetId" UUID NOT NULL,
    "orderLineId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pickOrder" INTEGER NOT NULL,
    "isPicked" BOOLEAN DEFAULT false,
    "pickedAt" TIMESTAMP(6),

    CONSTRAINT "PickSheetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteExport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "exportDate" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "orderCount" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "exportedBy" UUID NOT NULL,

    CONSTRAINT "RouteExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "routeDate" TIMESTAMP(6) NOT NULL,
    "routeName" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "truckNumber" TEXT,
    "startTime" TIMESTAMP(6) NOT NULL,
    "estimatedEndTime" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "stopNumber" INTEGER NOT NULL,
    "estimatedArrival" TIMESTAMP(6) NOT NULL,
    "actualArrival" TIMESTAMP(6),
    "status" TEXT DEFAULT 'pending',
    "notes" TEXT,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "salesRepId" UUID,
    "boundaries" JSONB,
    "color" TEXT DEFAULT '#3b82f6',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodingCache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "cachedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodingCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "businessCardUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageScan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL DEFAULT '{}',
    "customerId" UUID,
    "status" TEXT DEFAULT 'processing',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "ImageScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "attempts" INTEGER DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailchimpSync" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "listId" TEXT NOT NULL,
    "listName" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(6),
    "isActive" BOOLEAN DEFAULT true,
    "syncConfig" JSONB,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailchimpSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mailchimpId" TEXT,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetSegment" TEXT,
    "status" TEXT DEFAULT 'draft',
    "sentAt" TIMESTAMP(6),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedInvoices" (
    "id" BIGSERIAL NOT NULL,
    "referenceNumber" INTEGER,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "dueDate" TEXT,
    "total" DECIMAL(12,2),
    "subtotal" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "customerName" TEXT,
    "customerAddress" TEXT,
    "itemCount" INTEGER,
    "lineItems" TEXT,
    "matched_customer_id" UUID,
    "match_confidence" DECIMAL(3,2),
    "match_method" TEXT,
    "imported_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "migrated_to_production" BOOLEAN DEFAULT false,
    "created_order_id" UUID,
    "created_invoice_id" UUID,
    "invoice_type" TEXT DEFAULT 'customer_sale',

    CONSTRAINT "ImportedInvoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalReplayStatus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "feed" TEXT NOT NULL,
    "status" "ReplayRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "recordCount" INTEGER,
    "errorCount" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalReplayStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoices" (
    "id" BIGSERIAL NOT NULL,
    "referenceNumber" INTEGER,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "total" DECIMAL(12,2),
    "supplierName" TEXT,
    "itemCount" INTEGER,
    "imported_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierInvoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_log" (
    "id" BIGSERIAL NOT NULL,
    "reference_number" INTEGER NOT NULL,
    "attempt_status" TEXT NOT NULL,
    "message" TEXT,
    "error_details" TEXT,
    "attempted_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" BIGSERIAL NOT NULL,
    "reference_number" INTEGER NOT NULL,
    "date" DATE,
    "customer_name" TEXT,
    "delivery_method" TEXT,
    "status" TEXT,
    "invoice_type" TEXT,
    "file_path" TEXT,
    "file_size_kb" DECIMAL,
    "download_status" TEXT DEFAULT 'pending',
    "downloaded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagDefinition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'SEGMENT',
    "color" TEXT,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "tagDefinitionId" UUID,
    "tagType" TEXT NOT NULL,
    "tagValue" TEXT,
    "source" TEXT DEFAULT 'MANUAL',
    "addedBy" UUID,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDuplicateFlag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "duplicateOfCustomerId" UUID,
    "flaggedByPortalUserId" UUID,
    "status" "CustomerDuplicateStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(6),
    "resolvedBy" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDuplicateFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedQuery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "queryText" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "queryText" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" "ScheduledReportType" NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "timeOfDay" TEXT NOT NULL DEFAULT '08:00',
    "recipientEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "nextScheduled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" UUID,
    "isSmartList" BOOLEAN NOT NULL DEFAULT false,
    "smartCriteria" JSONB,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailListMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaignList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION,
    "clickRate" DOUBLE PRECISION,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaignList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "activityId" UUID,
    "templateId" UUID,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSConversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "direction" "SMSDirection" NOT NULL,
    "status" "SMSStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "activityId" UUID,
    "externalId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SMSMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailchimpConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "accessToken" TEXT NOT NULL,
    "serverPrefix" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "audienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailchimpConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationPreference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferredTime" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reservedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(6),
    "releasedAt" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "orderedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedAt" TIMESTAMP(6),
    "receivedAt" TIMESTAMP(6),
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "formatType" "InvoiceFormatType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "applicableStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableLicenseTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "rate" DECIMAL(10,4) NOT NULL,
    "perUnit" TEXT,
    "effective" TIMESTAMP(3) NOT NULL,
    "expires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthThreshold" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "accountType" "AccountType",
    "accountPriority" "AccountPriority",
    "dormantDays" INTEGER NOT NULL DEFAULT 45,
    "gracePeriodPercent" DECIMAL(3,2) NOT NULL DEFAULT 0.30,
    "revenueDeclinePercent" DECIMAL(3,2) NOT NULL DEFAULT 0.15,
    "minGraceDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuDemandStats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "meanDailyDemand" DECIMAL(10,4) NOT NULL,
    "sdDailyDemand" DECIMAL(10,4) NOT NULL,
    "minDailyDemand" INTEGER NOT NULL DEFAULT 0,
    "maxDailyDemand" INTEGER NOT NULL DEFAULT 0,
    "totalDemand" INTEGER NOT NULL DEFAULT 0,
    "daysWithDemand" INTEGER NOT NULL DEFAULT 0,
    "daysInPeriod" INTEGER NOT NULL DEFAULT 90,
    "meanLeadDays" INTEGER NOT NULL DEFAULT 7,
    "sdLeadDays" INTEGER NOT NULL DEFAULT 2,
    "reorderPoint" INTEGER NOT NULL,
    "serviceLevelZ" DECIMAL(4,2) NOT NULL DEFAULT 1.64,
    "targetDaysOfSupply" INTEGER NOT NULL DEFAULT 14,
    "eoq" INTEGER,
    "maxCapacity" INTEGER,
    "demandPattern" TEXT,
    "intermittencyRate" DECIMAL(5,2),
    "coefficientOfVariation" DECIMAL(6,4),
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lookbackDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuDemandStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageExport" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SageExportStatus" NOT NULL DEFAULT 'PENDING',
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "sampleRecordCount" INTEGER NOT NULL DEFAULT 0,
    "sampleInvoiceCount" INTEGER NOT NULL DEFAULT 0,
    "storageInvoiceCount" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT,
    "fileName" TEXT,
    "fileContent" BYTEA,
    "sampleFilePath" TEXT,
    "sampleFileName" TEXT,
    "sampleFileContent" BYTEA,
    "exportedBy" UUID NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "SageExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageExportError" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "exportId" UUID NOT NULL,
    "invoiceId" UUID,
    "orderId" UUID,
    "customerId" UUID,
    "skuId" UUID,
    "errorType" "SageErrorType" NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "rowData" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SageExportError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_code_key" ON "Role"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "PortalUser_tenantId_idx" ON "PortalUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_tenantId_email_key" ON "PortalUser"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSession_refreshToken_key" ON "PortalSession"("refreshToken");

-- CreateIndex
CREATE INDEX "PortalSession_tenantId_idx" ON "PortalSession"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSession_refreshToken_key" ON "SalesSession"("refreshToken");

-- CreateIndex
CREATE INDEX "SalesSession_tenantId_idx" ON "SalesSession"("tenantId");

-- CreateIndex
CREATE INDEX "SalesSession_userId_idx" ON "SalesSession"("userId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_name_key" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_name_key" ON "Product"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFieldDefinition_key_key" ON "ProductFieldDefinition"("key");

-- CreateIndex
CREATE INDEX "ProductFieldDefinition_scope_idx" ON "ProductFieldDefinition"("scope");

-- CreateIndex
CREATE INDEX "ProductFieldOption_fieldId_sortOrder_idx" ON "ProductFieldOption"("fieldId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFieldOption_fieldId_value_key" ON "ProductFieldOption"("fieldId", "value");

-- CreateIndex
CREATE INDEX "TenantProductFieldConfig_tenantId_idx" ON "TenantProductFieldConfig"("tenantId");

-- CreateIndex
CREATE INDEX "TenantProductFieldConfig_fieldId_idx" ON "TenantProductFieldConfig"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantProductFieldConfig_tenantId_fieldId_key" ON "TenantProductFieldConfig"("tenantId", "fieldId");

-- CreateIndex
CREATE INDEX "ProductLifecycleSnapshot_tenantId_idx" ON "ProductLifecycleSnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "ProductLifecycleSnapshot_productId_status_effectiveAt_idx" ON "ProductLifecycleSnapshot"("productId", "status", "effectiveAt");

-- CreateIndex
CREATE INDEX "ProductLifecycleSnapshot_status_idx" ON "ProductLifecycleSnapshot"("status");

-- CreateIndex
CREATE INDEX "Sku_tenantId_idx" ON "Sku"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_tenantId_code_key" ON "Sku"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Inventory_tenantId_idx" ON "Inventory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_tenantId_skuId_location_key" ON "Inventory"("tenantId", "skuId", "location");

-- CreateIndex
CREATE INDEX "PriceList_tenantId_idx" ON "PriceList"("tenantId");

-- CreateIndex
CREATE INDEX "PriceList_jurisdictionType_idx" ON "PriceList"("jurisdictionType");

-- CreateIndex
CREATE INDEX "PriceList_jurisdictionValue_idx" ON "PriceList"("jurisdictionValue");

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_tenantId_name_key" ON "PriceList"("tenantId", "name");

-- CreateIndex
CREATE INDEX "PriceListItem_tenantId_idx" ON "PriceListItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_tenantId_priceListId_skuId_key" ON "PriceListItem"("tenantId", "priceListId", "skuId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_salesRepId_idx" ON "Customer"("salesRepId");

-- CreateIndex
CREATE INDEX "Customer_riskStatus_idx" ON "Customer"("riskStatus");

-- CreateIndex
CREATE INDEX "Customer_accountPriority_idx" ON "Customer"("accountPriority");

-- CreateIndex
CREATE INDEX "Customer_accountType_idx" ON "Customer"("accountType");

-- CreateIndex
CREATE INDEX "Customer_territory_idx" ON "Customer"("territory");

-- CreateIndex
CREATE INDEX "Customer_lastOrderDate_idx" ON "Customer"("tenantId", "lastOrderDate" DESC);

-- CreateIndex
CREATE INDEX "Customer_territory_lastOrder_idx" ON "Customer"("tenantId", "territory", "lastOrderDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_externalId_key" ON "Customer"("tenantId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");

-- CreateIndex
CREATE INDEX "Order_deliveryWeek_idx" ON "Order"("deliveryWeek");

-- CreateIndex
CREATE INDEX "Order_deliveryDate_idx" ON "Order"("deliveryDate");

-- CreateIndex
CREATE INDEX "Order_isEventSale_idx" ON "Order"("isEventSale");

-- CreateIndex
CREATE INDEX "Order_customerId_orderedAt_idx" ON "Order"("customerId", "orderedAt" DESC);

-- CreateIndex
CREATE INDEX "Order_requiresApproval_status_idx" ON "Order"("requiresApproval", "status");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_salesRepId_idx" ON "Order"("salesRepId");

-- CreateIndex
CREATE INDEX "OrderLine_tenantId_idx" ON "OrderLine"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceFormatType_idx" ON "Invoice"("invoiceFormatType");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Cart_tenantId_idx" ON "Cart"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_tenantId_portalUserId_status_key" ON "Cart"("tenantId", "portalUserId", "status");

-- CreateIndex
CREATE INDEX "CartItem_tenantId_idx" ON "CartItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_tenantId_cartId_skuId_key" ON "CartItem"("tenantId", "cartId", "skuId");

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_idx" ON "CustomerAddress"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_customerId_idx" ON "CustomerAddress"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAddress_tenantId_customerId_label_key" ON "CustomerAddress"("tenantId", "customerId", "label");

-- CreateIndex
CREATE INDEX "PortalNotification_tenantId_portalUserId_createdAt_idx" ON "PortalNotification"("tenantId", "portalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalNotification_tenantId_portalUserId_readAt_idx" ON "PortalNotification"("tenantId", "portalUserId", "readAt");

-- CreateIndex
CREATE INDEX "ActivityType_tenantId_idx" ON "ActivityType"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityType_tenantId_code_key" ON "ActivityType"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Activity_tenantId_idx" ON "Activity"("tenantId");

-- CreateIndex
CREATE INDEX "SampleList_tenantId_idx" ON "SampleList"("tenantId");

-- CreateIndex
CREATE INDEX "SampleList_salesRepId_isActive_idx" ON "SampleList"("salesRepId", "isActive");

-- CreateIndex
CREATE INDEX "SampleListItem_skuId_idx" ON "SampleListItem"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleListItem_sampleListId_skuId_key" ON "SampleListItem"("sampleListId", "skuId");

-- CreateIndex
CREATE INDEX "ActivitySampleItem_activityId_idx" ON "ActivitySampleItem"("activityId");

-- CreateIndex
CREATE INDEX "ActivitySampleItem_skuId_idx" ON "ActivitySampleItem"("skuId");

-- CreateIndex
CREATE INDEX "ActivitySampleItem_followUpNeeded_followUpCompletedAt_idx" ON "ActivitySampleItem"("followUpNeeded", "followUpCompletedAt");

-- CreateIndex
CREATE INDEX "CallPlan_tenantId_idx" ON "CallPlan"("tenantId");

-- CreateIndex
CREATE INDEX "CallPlan_status_idx" ON "CallPlan"("status");

-- CreateIndex
CREATE INDEX "CallPlan_week_idx" ON "CallPlan"("tenantId", "weekNumber", "year");

-- CreateIndex
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

-- CreateIndex
CREATE INDEX "Task_assignedById_idx" ON "Task"("assignedById");

-- CreateIndex
CREATE INDEX "AccountHealthSnapshot_tenantId_idx" ON "AccountHealthSnapshot"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountHealthSnapshot_tenantId_customerId_snapshotDate_key" ON "AccountHealthSnapshot"("tenantId", "customerId", "snapshotDate");

-- CreateIndex
CREATE INDEX "ImportTemplate_tenantId_idx" ON "ImportTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ImportTemplate_dataType_idx" ON "ImportTemplate"("dataType");

-- CreateIndex
CREATE INDEX "ImportBatch_tenantId_idx" ON "ImportBatch"("tenantId");

-- CreateIndex
CREATE INDEX "ImportBatch_tenantId_status_idx" ON "ImportBatch"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImportBatch_templateId_idx" ON "ImportBatch"("templateId");

-- CreateIndex
CREATE INDEX "ImportBatch_checksum_idx" ON "ImportBatch"("checksum");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_idx" ON "ImportRow"("batchId");

-- CreateIndex
CREATE INDEX "ImportRow_tenantId_status_idx" ON "ImportRow"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImportRow_tenantId_externalKey_idx" ON "ImportRow"("tenantId", "externalKey");

-- CreateIndex
CREATE INDEX "SalesMetric_tenantId_idx" ON "SalesMetric"("tenantId");

-- CreateIndex
CREATE INDEX "ComplianceFiling_tenantId_idx" ON "ComplianceFiling"("tenantId");

-- CreateIndex
CREATE INDEX "StateCompliance_tenantId_idx" ON "StateCompliance"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StateCompliance_tenantId_state_key" ON "StateCompliance"("tenantId", "state");

-- CreateIndex
CREATE INDEX "StateTaxRate_tenantId_idx" ON "StateTaxRate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StateTaxRate_tenantId_state_effective_key" ON "StateTaxRate"("tenantId", "state", "effective");

-- CreateIndex
CREATE INDEX "WebhookSubscription_tenantId_idx" ON "WebhookSubscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookSubscription_tenantId_eventType_targetUrl_key" ON "WebhookSubscription"("tenantId", "eventType", "targetUrl");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_idx" ON "WebhookEvent"("tenantId");

-- CreateIndex
CREATE INDEX "IntegrationToken_tenantId_idx" ON "IntegrationToken"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationToken_tenantId_provider_key" ON "IntegrationToken"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AzugaIntegrationSettings_tenantId_key" ON "AzugaIntegrationSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AzugaIntegrationSettings_tenantId_idx" ON "AzugaIntegrationSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_userId_key" ON "SalesRep"("userId");

-- CreateIndex
CREATE INDEX "SalesRep_tenantId_idx" ON "SalesRep"("tenantId");

-- CreateIndex
CREATE INDEX "SalesRep_isActive_idx" ON "SalesRep"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_tenantId_userId_key" ON "SalesRep"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_tenantId_idx" ON "CustomerAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_salesRepId_idx" ON "CustomerAssignment"("salesRepId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_customerId_idx" ON "CustomerAssignment"("customerId");

-- CreateIndex
CREATE INDEX "SampleUsage_tenantId_idx" ON "SampleUsage"("tenantId");

-- CreateIndex
CREATE INDEX "SampleUsage_salesRepId_tastedAt_idx" ON "SampleUsage"("salesRepId", "tastedAt");

-- CreateIndex
CREATE INDEX "SampleUsage_customerId_idx" ON "SampleUsage"("customerId");

-- CreateIndex
CREATE INDEX "RepWeeklyMetric_tenantId_idx" ON "RepWeeklyMetric"("tenantId");

-- CreateIndex
CREATE INDEX "RepWeeklyMetric_salesRepId_idx" ON "RepWeeklyMetric"("salesRepId");

-- CreateIndex
CREATE INDEX "RepWeeklyMetric_weekStartDate_idx" ON "RepWeeklyMetric"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "RepWeeklyMetric_tenantId_salesRepId_weekStartDate_key" ON "RepWeeklyMetric"("tenantId", "salesRepId", "weekStartDate");

-- CreateIndex
CREATE INDEX "RepProductGoal_tenantId_idx" ON "RepProductGoal"("tenantId");

-- CreateIndex
CREATE INDEX "RepProductGoal_salesRepId_idx" ON "RepProductGoal"("salesRepId");

-- CreateIndex
CREATE INDEX "RepProductGoal_periodStart_periodEnd_idx" ON "RepProductGoal"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TopProduct_tenantId_calculatedAt_rankingType_idx" ON "TopProduct"("tenantId", "calculatedAt", "rankingType");

-- CreateIndex
CREATE UNIQUE INDEX "TopProduct_tenantId_calculatedAt_rankingType_rank_key" ON "TopProduct"("tenantId", "calculatedAt", "rankingType", "rank");

-- CreateIndex
CREATE INDEX "SalesIncentive_tenantId_idx" ON "SalesIncentive"("tenantId");

-- CreateIndex
CREATE INDEX "SalesIncentive_isActive_startDate_endDate_idx" ON "SalesIncentive"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_tenantId_userId_startTime_idx" ON "CalendarEvent"("tenantId", "userId", "startTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startTime_idx" ON "CalendarEvent"("userId", "startTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_callPlanAccountId_idx" ON "CalendarEvent"("callPlanAccountId");

-- CreateIndex
CREATE INDEX "CalendarEvent_externalEventId_idx" ON "CalendarEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "JobRunLog_jobName_startedAt_idx" ON "JobRunLog"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "JobRunLog_tenantSlug_startedAt_idx" ON "JobRunLog"("tenantSlug", "startedAt");

-- CreateIndex
CREATE INDEX "HealthPingLog_targetTenant_checkedAt_idx" ON "HealthPingLog"("targetTenant", "checkedAt");

-- CreateIndex
CREATE INDEX "HealthPingLog_checkedAt_idx" ON "HealthPingLog"("checkedAt");

-- CreateIndex
CREATE INDEX "DataIntegritySnapshot_tenantId_snapshotDate_idx" ON "DataIntegritySnapshot"("tenantId", "snapshotDate");

-- CreateIndex
CREATE INDEX "DataIntegritySnapshot_tenantId_idx" ON "DataIntegritySnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "CallPlanAccount_tenantId_idx" ON "CallPlanAccount"("tenantId");

-- CreateIndex
CREATE INDEX "CallPlanAccount_callPlanId_idx" ON "CallPlanAccount"("callPlanId");

-- CreateIndex
CREATE INDEX "CallPlanAccount_customerId_idx" ON "CallPlanAccount"("customerId");

-- CreateIndex
CREATE INDEX "CallPlanAccount_contactOutcome_idx" ON "CallPlanAccount"("contactOutcome");

-- CreateIndex
CREATE UNIQUE INDEX "CallPlanAccount_callPlanId_customerId_key" ON "CallPlanAccount"("callPlanId", "customerId");

-- CreateIndex
CREATE INDEX "CallPlanActivity_tenantId_idx" ON "CallPlanActivity"("tenantId");

-- CreateIndex
CREATE INDEX "CallPlanActivity_callPlanId_idx" ON "CallPlanActivity"("callPlanId");

-- CreateIndex
CREATE INDEX "CallPlanActivity_customerId_idx" ON "CallPlanActivity"("customerId");

-- CreateIndex
CREATE INDEX "CallPlanSchedule_tenant_idx" ON "CallPlanSchedule"("tenantId");

-- CreateIndex
CREATE INDEX "CallPlanSchedule_callPlanDate_idx" ON "CallPlanSchedule"("callPlanId", "scheduledDate");

-- CreateIndex
CREATE INDEX "CallPlanSchedule_customer_idx" ON "CallPlanSchedule"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CallPlanSchedule_unique_slot" ON "CallPlanSchedule"("tenantId", "callPlanId", "customerId", "scheduledDate", "scheduledTime");

-- CreateIndex
CREATE INDEX "TerritoryBlock_tenant_idx" ON "TerritoryBlock"("tenantId");

-- CreateIndex
CREATE INDEX "TerritoryBlock_callPlan_day_idx" ON "TerritoryBlock"("callPlanId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TerritoryBlock_territory_idx" ON "TerritoryBlock"("territory");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryBlock_unique_day" ON "TerritoryBlock"("tenantId", "callPlanId", "dayOfWeek", "territory");

-- CreateIndex
CREATE INDEX "RecurringCallPlan_customer_idx" ON "RecurringCallPlan"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "RecurringCallPlan_frequency_idx" ON "RecurringCallPlan"("tenantId", "frequency", "active");

-- CreateIndex
CREATE INDEX "CalendarSync_tenantId_userId_idx" ON "CalendarSync"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_tenantId_userId_provider_key" ON "CalendarSync"("tenantId", "userId", "provider");

-- CreateIndex
CREATE INDEX "AutomatedTrigger_tenantId_triggerType_idx" ON "AutomatedTrigger"("tenantId", "triggerType");

-- CreateIndex
CREATE INDEX "TriggeredTask_tenantId_triggerId_idx" ON "TriggeredTask"("tenantId", "triggerId");

-- CreateIndex
CREATE INDEX "TriggeredTask_customerId_idx" ON "TriggeredTask"("customerId");

-- CreateIndex
CREATE INDEX "SampleFeedbackTemplate_tenantId_category_idx" ON "SampleFeedbackTemplate"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SampleFeedbackTemplate_tenantId_label_key" ON "SampleFeedbackTemplate"("tenantId", "label");

-- CreateIndex
CREATE INDEX "SampleMetrics_tenantId_periodStart_idx" ON "SampleMetrics"("tenantId", "periodStart");

-- CreateIndex
CREATE INDEX "SampleMetrics_conversionRate_idx" ON "SampleMetrics"("conversionRate");

-- CreateIndex
CREATE UNIQUE INDEX "SampleMetrics_tenantId_skuId_periodStart_key" ON "SampleMetrics"("tenantId", "skuId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseConfig_tenantId_key" ON "WarehouseConfig"("tenantId");

-- CreateIndex
CREATE INDEX "PickSheet_tenantId_status_idx" ON "PickSheet"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PickSheet_tenantId_sheetNumber_key" ON "PickSheet"("tenantId", "sheetNumber");

-- CreateIndex
CREATE INDEX "PickSheetItem_pickSheetId_idx" ON "PickSheetItem"("pickSheetId");

-- CreateIndex
CREATE INDEX "PickSheetItem_tenantId_pickSheetId_pickOrder_idx" ON "PickSheetItem"("tenantId", "pickSheetId", "pickOrder");

-- CreateIndex
CREATE INDEX "RouteExport_tenantId_exportDate_idx" ON "RouteExport"("tenantId", "exportDate");

-- CreateIndex
CREATE INDEX "DeliveryRoute_tenantId_routeDate_idx" ON "DeliveryRoute"("tenantId", "routeDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRoute_tenantId_routeDate_routeName_key" ON "DeliveryRoute"("tenantId", "routeDate", "routeName");

-- CreateIndex
CREATE INDEX "RouteStop_tenantId_routeId_idx" ON "RouteStop"("tenantId", "routeId");

-- CreateIndex
CREATE INDEX "RouteStop_orderId_idx" ON "RouteStop"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_stopNumber_key" ON "RouteStop"("routeId", "stopNumber");

-- CreateIndex
CREATE INDEX "Territory_tenantId_idx" ON "Territory"("tenantId");

-- CreateIndex
CREATE INDEX "Territory_salesRepId_idx" ON "Territory"("salesRepId");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_tenantId_name_key" ON "Territory"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodingCache_address_key" ON "GeocodingCache"("address");

-- CreateIndex
CREATE INDEX "GeocodingCache_cachedAt_idx" ON "GeocodingCache"("cachedAt");

-- CreateIndex
CREATE INDEX "GeocodingCache_address_idx" ON "GeocodingCache"("address");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_customerId_idx" ON "CustomerContact"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "ImageScan_tenantId_userId_idx" ON "ImageScan"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ImageScan_status_idx" ON "ImageScan"("status");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MailchimpSync_tenantId_idx" ON "MailchimpSync"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MailchimpSync_tenantId_listId_key" ON "MailchimpSync"("tenantId", "listId");

-- CreateIndex
CREATE INDEX "EmailCampaign_tenantId_status_idx" ON "EmailCampaign"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedInvoices_referenceNumber_key" ON "ImportedInvoices"("referenceNumber");

-- CreateIndex
CREATE INDEX "idx_imported_customer" ON "ImportedInvoices"("matched_customer_id");

-- CreateIndex
CREATE INDEX "idx_imported_migrated" ON "ImportedInvoices"("migrated_to_production");

-- CreateIndex
CREATE INDEX "idx_imported_ref" ON "ImportedInvoices"("referenceNumber");

-- CreateIndex
CREATE INDEX "PortalReplayStatus_tenantId_completedAt_idx" ON "PortalReplayStatus"("tenantId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalReplayStatus_tenantId_feed_key" ON "PortalReplayStatus"("tenantId", "feed");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoices_referenceNumber_key" ON "SupplierInvoices"("referenceNumber");

-- CreateIndex
CREATE INDEX "idx_download_log_reference" ON "download_log"("reference_number");

-- CreateIndex
CREATE INDEX "idx_download_log_status" ON "download_log"("attempt_status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_reference_number_key" ON "invoices"("reference_number");

-- CreateIndex
CREATE INDEX "idx_invoices_date" ON "invoices"("date" DESC);

-- CreateIndex
CREATE INDEX "idx_invoices_reference" ON "invoices"("reference_number");

-- CreateIndex
CREATE INDEX "idx_invoices_status" ON "invoices"("download_status");

-- CreateIndex
CREATE INDEX "TagDefinition_tenantId_idx" ON "TagDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "TagDefinition_category_idx" ON "TagDefinition"("category");

-- CreateIndex
CREATE INDEX "TagDefinition_parentId_idx" ON "TagDefinition"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TagDefinition_tenantId_code_key" ON "TagDefinition"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CustomerTag_tenantId_idx" ON "CustomerTag"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerTag_customerId_idx" ON "CustomerTag"("customerId");

-- CreateIndex
CREATE INDEX "CustomerTag_tagType_idx" ON "CustomerTag"("tagType");

-- CreateIndex
CREATE INDEX "CustomerTag_tagType_totalRevenue_idx" ON "CustomerTag"("tagType", "totalRevenue" DESC);

-- CreateIndex
CREATE INDEX "CustomerTag_removedAt_idx" ON "CustomerTag"("removedAt");

-- CreateIndex
CREATE INDEX "CustomerTag_tagDefinitionId_idx" ON "CustomerTag"("tagDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_tenantId_customerId_tagType_removedAt_key" ON "CustomerTag"("tenantId", "customerId", "tagType", "removedAt");

-- CreateIndex
CREATE INDEX "CustomerDuplicateFlag_tenantId_idx" ON "CustomerDuplicateFlag"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerDuplicateFlag_customerId_idx" ON "CustomerDuplicateFlag"("customerId");

-- CreateIndex
CREATE INDEX "CustomerDuplicateFlag_status_idx" ON "CustomerDuplicateFlag"("status");

-- CreateIndex
CREATE INDEX "CustomerDuplicateFlag_duplicateOfCustomerId_idx" ON "CustomerDuplicateFlag"("duplicateOfCustomerId");

-- CreateIndex
CREATE INDEX "CustomerDuplicateFlag_flaggedByPortalUserId_idx" ON "CustomerDuplicateFlag"("flaggedByPortalUserId");

-- CreateIndex
CREATE INDEX "SavedQuery_tenantId_userId_idx" ON "SavedQuery"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SavedQuery_tenantId_isTemplate_idx" ON "SavedQuery"("tenantId", "isTemplate");

-- CreateIndex
CREATE INDEX "SavedQuery_lastUsedAt_idx" ON "SavedQuery"("lastUsedAt");

-- CreateIndex
CREATE INDEX "QueryHistory_tenantId_userId_executedAt_idx" ON "QueryHistory"("tenantId", "userId", "executedAt");

-- CreateIndex
CREATE INDEX "ScheduledReport_tenantId_userId_idx" ON "ScheduledReport"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ScheduledReport_isActive_nextScheduled_idx" ON "ScheduledReport"("isActive", "nextScheduled");

-- CreateIndex
CREATE INDEX "EmailList_tenantId_idx" ON "EmailList"("tenantId");

-- CreateIndex
CREATE INDEX "EmailList_ownerId_idx" ON "EmailList"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailList_tenantId_name_key" ON "EmailList"("tenantId", "name");

-- CreateIndex
CREATE INDEX "EmailListMember_tenantId_idx" ON "EmailListMember"("tenantId");

-- CreateIndex
CREATE INDEX "EmailListMember_listId_idx" ON "EmailListMember"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailListMember_listId_customerId_key" ON "EmailListMember"("listId", "customerId");

-- CreateIndex
CREATE INDEX "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_tenantId_name_key" ON "EmailTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "EmailCampaignList_tenantId_idx" ON "EmailCampaignList"("tenantId");

-- CreateIndex
CREATE INDEX "EmailCampaignList_campaignId_idx" ON "EmailCampaignList"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCampaignList_campaignId_listId_key" ON "EmailCampaignList"("campaignId", "listId");

-- CreateIndex
CREATE INDEX "EmailMessage_tenantId_idx" ON "EmailMessage"("tenantId");

-- CreateIndex
CREATE INDEX "EmailMessage_customerId_idx" ON "EmailMessage"("customerId");

-- CreateIndex
CREATE INDEX "EmailMessage_status_idx" ON "EmailMessage"("status");

-- CreateIndex
CREATE INDEX "EmailMessage_externalId_idx" ON "EmailMessage"("externalId");

-- CreateIndex
CREATE INDEX "SMSConversation_tenantId_idx" ON "SMSConversation"("tenantId");

-- CreateIndex
CREATE INDEX "SMSConversation_customerId_idx" ON "SMSConversation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SMSConversation_tenantId_customerId_phoneNumber_key" ON "SMSConversation"("tenantId", "customerId", "phoneNumber");

-- CreateIndex
CREATE INDEX "SMSMessage_tenantId_idx" ON "SMSMessage"("tenantId");

-- CreateIndex
CREATE INDEX "SMSMessage_conversationId_idx" ON "SMSMessage"("conversationId");

-- CreateIndex
CREATE INDEX "SMSMessage_externalId_idx" ON "SMSMessage"("externalId");

-- CreateIndex
CREATE INDEX "SMSMessage_status_idx" ON "SMSMessage"("status");

-- CreateIndex
CREATE INDEX "SMSTemplate_tenantId_idx" ON "SMSTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "SMSTemplate_category_idx" ON "SMSTemplate"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SMSTemplate_tenantId_name_key" ON "SMSTemplate"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MailchimpConnection_tenantId_key" ON "MailchimpConnection"("tenantId");

-- CreateIndex
CREATE INDEX "MailchimpConnection_tenantId_idx" ON "MailchimpConnection"("tenantId");

-- CreateIndex
CREATE INDEX "CommunicationPreference_tenantId_idx" ON "CommunicationPreference"("tenantId");

-- CreateIndex
CREATE INDEX "CommunicationPreference_customerId_idx" ON "CommunicationPreference"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationPreference_tenantId_customerId_key" ON "CommunicationPreference"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_idx" ON "InventoryReservation"("orderId");

-- CreateIndex
CREATE INDEX "InventoryReservation_skuId_idx" ON "InventoryReservation"("skuId");

-- CreateIndex
CREATE INDEX "InventoryReservation_status_idx" ON "InventoryReservation"("status");

-- CreateIndex
CREATE INDEX "InventoryReservation_tenantId_idx" ON "InventoryReservation"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_expectedAt_idx" ON "PurchaseOrder"("expectedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_skuId_idx" ON "PurchaseOrderLine"("skuId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_tenantId_idx" ON "PurchaseOrderLine"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_tenantId_formatType_idx" ON "InvoiceTemplate"("tenantId", "formatType");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceTemplate_tenantId_name_key" ON "InvoiceTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TaxRule_tenantId_state_taxType_idx" ON "TaxRule"("tenantId", "state", "taxType");

-- CreateIndex
CREATE INDEX "TaxRule_effective_expires_idx" ON "TaxRule"("effective", "expires");

-- CreateIndex
CREATE INDEX "HealthThreshold_tenantId_idx" ON "HealthThreshold"("tenantId");

-- CreateIndex
CREATE INDEX "HealthThreshold_accountType_idx" ON "HealthThreshold"("accountType");

-- CreateIndex
CREATE INDEX "HealthThreshold_accountPriority_idx" ON "HealthThreshold"("accountPriority");

-- CreateIndex
CREATE UNIQUE INDEX "HealthThreshold_tenantId_accountType_accountPriority_key" ON "HealthThreshold"("tenantId", "accountType", "accountPriority");

-- CreateIndex
CREATE UNIQUE INDEX "SkuDemandStats_skuId_key" ON "SkuDemandStats"("skuId");

-- CreateIndex
CREATE INDEX "SkuDemandStats_tenantId_idx" ON "SkuDemandStats"("tenantId");

-- CreateIndex
CREATE INDEX "SkuDemandStats_tenantId_reorderPoint_idx" ON "SkuDemandStats"("tenantId", "reorderPoint");

-- CreateIndex
CREATE INDEX "SkuDemandStats_lastCalculated_idx" ON "SkuDemandStats"("lastCalculated");

-- CreateIndex
CREATE UNIQUE INDEX "SkuDemandStats_tenantId_skuId_key" ON "SkuDemandStats"("tenantId", "skuId");

-- CreateIndex
CREATE INDEX "SageExport_tenantId_idx" ON "SageExport"("tenantId");

-- CreateIndex
CREATE INDEX "SageExport_status_idx" ON "SageExport"("status");

-- CreateIndex
CREATE INDEX "SageExport_exportedAt_idx" ON "SageExport"("exportedAt");

-- CreateIndex
CREATE INDEX "SageExport_startDate_endDate_idx" ON "SageExport"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SageExportError_tenantId_idx" ON "SageExportError"("tenantId");

-- CreateIndex
CREATE INDEX "SageExportError_exportId_idx" ON "SageExportError"("exportId");

-- CreateIndex
CREATE INDEX "SageExportError_errorType_idx" ON "SageExportError"("errorType");

-- CreateIndex
CREATE INDEX "SageExportError_resolvedAt_idx" ON "SageExportError"("resolvedAt");

-- CreateIndex
CREATE INDEX "SageExportError_customerId_idx" ON "SageExportError"("customerId");

-- CreateIndex
CREATE INDEX "SageExportError_skuId_idx" ON "SageExportError"("skuId");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUserRole" ADD CONSTRAINT "PortalUserRole_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUserRole" ADD CONSTRAINT "PortalUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesSession" ADD CONSTRAINT "SalesSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SalesSession" ADD CONSTRAINT "SalesSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFieldOption" ADD CONSTRAINT "ProductFieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ProductFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProductFieldConfig" ADD CONSTRAINT "TenantProductFieldConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProductFieldConfig" ADD CONSTRAINT "TenantProductFieldConfig_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ProductFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLifecycleSnapshot" ADD CONSTRAINT "ProductLifecycleSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLifecycleSnapshot" ADD CONSTRAINT "ProductLifecycleSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalNotification" ADD CONSTRAINT "PortalNotification_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalNotification" ADD CONSTRAINT "PortalNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityType" ADD CONSTRAINT "ActivityType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleList" ADD CONSTRAINT "SampleList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleList" ADD CONSTRAINT "SampleList_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleListItem" ADD CONSTRAINT "SampleListItem_sampleListId_fkey" FOREIGN KEY ("sampleListId") REFERENCES "SampleList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleListItem" ADD CONSTRAINT "SampleListItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySampleItem" ADD CONSTRAINT "ActivitySampleItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySampleItem" ADD CONSTRAINT "ActivitySampleItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySampleItem" ADD CONSTRAINT "ActivitySampleItem_sampleListItemId_fkey" FOREIGN KEY ("sampleListItemId") REFERENCES "SampleListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallPlan" ADD CONSTRAINT "CallPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallPlan" ADD CONSTRAINT "CallPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_callPlanId_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHealthSnapshot" ADD CONSTRAINT "AccountHealthSnapshot_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHealthSnapshot" ADD CONSTRAINT "AccountHealthSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ImportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesMetric" ADD CONSTRAINT "SalesMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFiling" ADD CONSTRAINT "ComplianceFiling_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateCompliance" ADD CONSTRAINT "StateCompliance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateTaxRate" ADD CONSTRAINT "StateTaxRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationToken" ADD CONSTRAINT "IntegrationToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AzugaIntegrationSettings" ADD CONSTRAINT "AzugaIntegrationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepWeeklyMetric" ADD CONSTRAINT "RepWeeklyMetric_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepWeeklyMetric" ADD CONSTRAINT "RepWeeklyMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepProductGoal" ADD CONSTRAINT "RepProductGoal_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepProductGoal" ADD CONSTRAINT "RepProductGoal_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepProductGoal" ADD CONSTRAINT "RepProductGoal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopProduct" ADD CONSTRAINT "TopProduct_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopProduct" ADD CONSTRAINT "TopProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesIncentive" ADD CONSTRAINT "SalesIncentive_targetSkuId_fkey" FOREIGN KEY ("targetSkuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesIncentive" ADD CONSTRAINT "SalesIncentive_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_callPlanAccount_fkey" FOREIGN KEY ("callPlanAccountId") REFERENCES "CallPlanAccount"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DataIntegritySnapshot" ADD CONSTRAINT "DataIntegritySnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanAccount" ADD CONSTRAINT "CallPlanAccount_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanAccount" ADD CONSTRAINT "CallPlanAccount_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanAccount" ADD CONSTRAINT "CallPlanAccount_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanActivity" ADD CONSTRAINT "CallPlanActivity_activityType_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanActivity" ADD CONSTRAINT "CallPlanActivity_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanActivity" ADD CONSTRAINT "CallPlanActivity_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanActivity" ADD CONSTRAINT "CallPlanActivity_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanSchedule" ADD CONSTRAINT "CallPlanSchedule_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanSchedule" ADD CONSTRAINT "CallPlanSchedule_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CallPlanSchedule" ADD CONSTRAINT "CallPlanSchedule_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TerritoryBlock" ADD CONSTRAINT "TerritoryBlock_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TerritoryBlock" ADD CONSTRAINT "TerritoryBlock_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RecurringCallPlan" ADD CONSTRAINT "RecurringCallPlan_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RecurringCallPlan" ADD CONSTRAINT "RecurringCallPlan_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AutomatedTrigger" ADD CONSTRAINT "AutomatedTrigger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TriggeredTask" ADD CONSTRAINT "TriggeredTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TriggeredTask" ADD CONSTRAINT "TriggeredTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TriggeredTask" ADD CONSTRAINT "TriggeredTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TriggeredTask" ADD CONSTRAINT "TriggeredTask_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "AutomatedTrigger"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SampleFeedbackTemplate" ADD CONSTRAINT "SampleFeedbackTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SampleMetrics" ADD CONSTRAINT "SampleMetrics_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SampleMetrics" ADD CONSTRAINT "SampleMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "WarehouseConfig" ADD CONSTRAINT "WarehouseConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheet" ADD CONSTRAINT "PickSheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheet" ADD CONSTRAINT "PickSheet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_pickSheetId_fkey" FOREIGN KEY ("pickSheetId") REFERENCES "PickSheet"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RouteExport" ADD CONSTRAINT "RouteExport_exportedBy_fkey" FOREIGN KEY ("exportedBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RouteExport" ADD CONSTRAINT "RouteExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DeliveryRoute"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageScan" ADD CONSTRAINT "ImageScan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImageScan" ADD CONSTRAINT "ImageScan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImageScan" ADD CONSTRAINT "ImageScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MailchimpSync" ADD CONSTRAINT "MailchimpSync_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PortalReplayStatus" ADD CONSTRAINT "PortalReplayStatus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TagDefinition" ADD CONSTRAINT "TagDefinition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TagDefinition"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TagDefinition" ADD CONSTRAINT "TagDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tagDefinitionId_fkey" FOREIGN KEY ("tagDefinitionId") REFERENCES "TagDefinition"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerDuplicateFlag" ADD CONSTRAINT "CustomerDuplicateFlag_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerDuplicateFlag" ADD CONSTRAINT "CustomerDuplicateFlag_duplicate_of_fkey" FOREIGN KEY ("duplicateOfCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerDuplicateFlag" ADD CONSTRAINT "CustomerDuplicateFlag_flagged_by_portal_user_fkey" FOREIGN KEY ("flaggedByPortalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerDuplicateFlag" ADD CONSTRAINT "CustomerDuplicateFlag_resolved_by_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CustomerDuplicateFlag" ADD CONSTRAINT "CustomerDuplicateFlag_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryHistory" ADD CONSTRAINT "QueryHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryHistory" ADD CONSTRAINT "QueryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailList" ADD CONSTRAINT "EmailList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailListMember" ADD CONSTRAINT "EmailListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "EmailList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailListMember" ADD CONSTRAINT "EmailListMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignList" ADD CONSTRAINT "EmailCampaignList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "EmailList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignList" ADD CONSTRAINT "EmailCampaignList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSConversation" ADD CONSTRAINT "SMSConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SMSConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSTemplate" ADD CONSTRAINT "SMSTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailchimpConnection" ADD CONSTRAINT "MailchimpConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPreference" ADD CONSTRAINT "CommunicationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthThreshold" ADD CONSTRAINT "HealthThreshold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuDemandStats" ADD CONSTRAINT "SkuDemandStats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuDemandStats" ADD CONSTRAINT "SkuDemandStats_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExport" ADD CONSTRAINT "SageExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExport" ADD CONSTRAINT "SageExport_exportedBy_fkey" FOREIGN KEY ("exportedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "SageExport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageExportError" ADD CONSTRAINT "SageExportError_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
