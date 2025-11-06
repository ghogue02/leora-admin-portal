# SAGE Export Validation System

A comprehensive data validation system for validating order data before exporting to SAGE accounting software. Designed to efficiently validate 100+ orders with minimal database queries using batch processing.

## Features

- ✅ **Batch Processing**: Validates multiple orders with optimized database queries (no N+1 problems)
- ✅ **Comprehensive Validation**: Checks customers, SKUs, sales reps, amounts, dates, and order lines
- ✅ **Structured Errors**: Returns detailed error information with types and context
- ✅ **Warnings vs Errors**: Distinguishes between blocking errors and non-blocking warnings
- ✅ **Performance**: Efficiently validates 100+ orders with 3 database queries
- ✅ **TypeScript**: Full type safety with comprehensive interfaces
- ✅ **Utility Functions**: Format errors, group by order/type, etc.

## Installation

No installation required - this is part of the Leora Admin Portal codebase.

## Usage

### Basic Usage

```typescript
import { PrismaClient } from '@prisma/client';
import { validateOrdersForExport, formatValidationErrors } from './lib/sage/validation';

const prisma = new PrismaClient();

// Fetch orders from database
const orders = await prisma.order.findMany({
  where: { status: 'APPROVED' },
  include: {
    orderLines: {
      select: {
        id: true,
        skuId: true,
        quantity: true,
        unitPrice: true,
      },
    },
  },
});

// Convert to validation format
const ordersToValidate = orders.map(order => ({
  id: order.id,
  customerId: order.customerId,
  orderedAt: order.orderedAt,
  total: order.total ? Number(order.total) : null,
  orderLines: order.orderLines.map(line => ({
    id: line.id,
    skuId: line.skuId,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
  })),
}));

// Validate
const result = await validateOrdersForExport(ordersToValidate, prisma);

// Check results
if (result.isValid) {
  console.log('✅ All orders valid for SAGE export');
  // Proceed with export...
} else {
  console.log('❌ Validation failed:');
  console.log(formatValidationErrors(result));
}
```

### Running Examples

See `validation-example.ts` for comprehensive usage examples:

```bash
npx tsx lib/sage/validation-example.ts
```

## Validation Rules

### Customer Validation (Blocking)
- ✅ Customer must exist in database
- ✅ Customer must have payment terms set
- ⚠️  Sales rep validation is warning-only (doesn't block export)

### SKU Validation (Blocking)
- ✅ SKU must exist in database
- ✅ SKU must be active (`isActive = true`)

### Sales Rep Validation (Warning Only)
- ⚠️  Sales rep should exist (warning if missing)
- ⚠️  Sales rep should be active (warning if inactive)

### Amount Validation (Blocking)
- ✅ Amounts must be valid numbers
- ✅ Negative amounts are allowed (for returns/credits)
- ✅ Zero amounts are allowed

### Date Validation (Blocking)
- ✅ Order date (`orderedAt`) is required
- ✅ Dates must be valid JavaScript Date objects

### Order Line Validation (Blocking)
- ✅ Order must have at least one order line
- ✅ Quantity must be positive number
- ✅ Unit price must be valid number (can be negative for credits)

## Error Types

```typescript
enum SageErrorType {
  // Customer errors
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  CUSTOMER_MISSING_PAYMENT_TERMS = 'CUSTOMER_MISSING_PAYMENT_TERMS',

  // SKU errors
  SKU_NOT_FOUND = 'SKU_NOT_FOUND',
  SKU_INACTIVE = 'SKU_INACTIVE',

  // Sales rep warnings
  SALES_REP_NOT_FOUND = 'SALES_REP_NOT_FOUND',
  SALES_REP_INACTIVE = 'SALES_REP_INACTIVE',

  // Amount errors
  INVALID_AMOUNT = 'INVALID_AMOUNT',

  // Date errors
  INVALID_DATE = 'INVALID_DATE',
  MISSING_ORDER_DATE = 'MISSING_ORDER_DATE',

  // Order errors
  MISSING_ORDER_TOTAL = 'MISSING_ORDER_TOTAL',
  EMPTY_ORDER_LINES = 'EMPTY_ORDER_LINES',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  INVALID_UNIT_PRICE = 'INVALID_UNIT_PRICE',
}
```

## Data Structures

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;                    // Overall validation status
  errors: ValidationError[];           // Blocking errors
  warnings: ValidationError[];         // Non-blocking warnings
  summary: {
    totalOrders: number;
    validOrders: number;
    invalidOrders: number;
    totalErrors: number;
    totalWarnings: number;
    errorsByType: Record<SageErrorType, number>;
  };
}
```

### ValidationError

```typescript
interface ValidationError {
  type: SageErrorType;                 // Error type enum
  message: string;                     // Human-readable message
  orderId: string;                     // Order that failed validation
  customerId?: string;                 // Related customer ID
  skuId?: string;                      // Related SKU ID
  salesRepId?: string;                 // Related sales rep ID
  orderLineId?: string;                // Related order line ID
  field?: string;                      // Field that failed validation
  value?: unknown;                     // Invalid value
  isWarning?: boolean;                 // True if warning, false if error
}
```

## Performance Optimization

The validation system uses **batch queries** to minimize database overhead:

```typescript
// ❌ BAD: N+1 queries (1000 orders = 1000 queries)
for (const order of orders) {
  const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
  // ... validate customer
}

// ✅ GOOD: Batch query (1000 orders = 1 query)
const customerIds = orders.map(o => o.customerId);
const customers = await prisma.customer.findMany({ where: { id: { in: customerIds } } });
const customerMap = new Map(customers.map(c => [c.id, c]));
// ... O(1) lookup for each order
```

**Performance stats for 100 orders:**
- **3 database queries** (customers, SKUs, sales reps)
- **O(1) lookup** for each validation check
- **~100ms** total validation time

## Utility Functions

### Format Errors

```typescript
import { formatValidationErrors } from './lib/sage/validation';

const formatted = formatValidationErrors(result);
console.log(formatted);
// === SAGE Export Validation Results ===
// Total Orders: 10
// Valid Orders: 8
// Invalid Orders: 2
// ...
```

### Group Errors by Order

```typescript
import { groupErrorsByOrder } from './lib/sage/validation';

const errorsByOrder = groupErrorsByOrder(result.errors);
for (const [orderId, errors] of errorsByOrder) {
  console.log(`Order ${orderId}: ${errors.length} errors`);
}
```

### Group Errors by Type

```typescript
import { groupErrorsByType } from './lib/sage/validation';

const errorsByType = groupErrorsByType(result.errors);
for (const [type, errors] of errorsByType) {
  console.log(`${type}: ${errors.length} occurrences`);
}
```

## Testing

Run the test suite:

```bash
npm test lib/sage/validation.test.ts
```

Test coverage includes:
- ✅ Valid orders pass validation
- ✅ Missing customers are detected
- ✅ Missing payment terms are detected
- ✅ Inactive SKUs are detected
- ✅ Inactive sales reps generate warnings (not errors)
- ✅ Negative amounts are allowed
- ✅ Empty order lines are detected
- ✅ Batch query optimization works correctly

## Integration with SAGE Export

```typescript
async function exportToSAGE() {
  // 1. Fetch orders
  const orders = await fetchOrdersForExport();

  // 2. Validate
  const validation = await validateOrdersForExport(orders, prisma);

  // 3. Check validation
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${formatValidationErrors(validation)}`);
  }

  // 4. Filter to only valid orders
  const errorOrderIds = new Set(validation.errors.map(e => e.orderId));
  const validOrders = orders.filter(o => !errorOrderIds.has(o.id));

  // 5. Log warnings (non-blocking)
  if (validation.warnings.length > 0) {
    console.warn('Export warnings:', validation.warnings);
  }

  // 6. Export to SAGE
  await exportOrdersToSAGE(validOrders);

  return {
    exported: validOrders.length,
    warnings: validation.warnings.length,
  };
}
```

## Business Rules Reference

See `/docs/SAGE_PAYMENT_TERMS.md` for complete business rules and payment terms configuration.

Common payment terms:
- Net 30
- Net 60
- COD (Cash on Delivery)
- CIA (Cash in Advance)

## File Structure

```
lib/sage/
├── validation.ts           # Main validation system
├── validation.test.ts      # Comprehensive tests
├── validation-example.ts   # Usage examples
└── README.md              # This file
```

## API Reference

### Main Functions

#### `validateOrdersForExport(orders, prisma)`
Validate a batch of orders for SAGE export.

**Parameters:**
- `orders: OrderToValidate[]` - Array of orders to validate
- `prisma: PrismaClient` - Prisma client instance

**Returns:** `Promise<ValidationResult>`

**Example:**
```typescript
const result = await validateOrdersForExport(orders, prisma);
```

---

#### `validateCustomer(order, customerMap, salesRepMap, errors, warnings)`
Validate customer exists and has payment terms.

**Parameters:**
- `order: OrderToValidate` - Order to validate
- `customerMap: Map<string, CustomerValidationData>` - Customer lookup map
- `salesRepMap: Map<string, SalesRepValidationData>` - Sales rep lookup map
- `errors: ValidationError[]` - Array to append errors
- `warnings: ValidationError[]` - Array to append warnings

**Returns:** `void` (modifies errors/warnings arrays)

---

#### `validateSku(orderId, orderLineId, skuId, skuMap, errors)`
Validate SKU exists and is active.

**Parameters:**
- `orderId: string` - Order ID
- `orderLineId: string` - Order line ID
- `skuId: string` - SKU ID to validate
- `skuMap: Map<string, SkuValidationData>` - SKU lookup map
- `errors: ValidationError[]` - Array to append errors

**Returns:** `void`

---

#### `validateSalesRep(orderId, salesRepId, salesRepMap, warnings)`
Validate sales rep exists (warning only).

**Parameters:**
- `orderId: string` - Order ID
- `salesRepId: string` - Sales rep ID to validate
- `salesRepMap: Map<string, SalesRepValidationData>` - Sales rep lookup map
- `warnings: ValidationError[]` - Array to append warnings

**Returns:** `void`

---

#### `validateAmount(orderId, field, amount, errors)`
Validate numeric amount (can be negative).

**Parameters:**
- `orderId: string` - Order ID
- `field: string` - Field name
- `amount: number | null` - Amount to validate
- `errors: ValidationError[]` - Array to append errors

**Returns:** `void`

---

#### `validateDate(orderId, field, date, errors, required)`
Validate date is valid.

**Parameters:**
- `orderId: string` - Order ID
- `field: string` - Field name
- `date: Date | null` - Date to validate
- `errors: ValidationError[]` - Array to append errors
- `required: boolean` - Whether date is required

**Returns:** `void`

---

### Utility Functions

#### `formatValidationErrors(result)`
Format validation results as human-readable text.

**Returns:** `string`

---

#### `groupErrorsByOrder(errors)`
Group errors by order ID.

**Returns:** `Map<string, ValidationError[]>`

---

#### `groupErrorsByType(errors)`
Group errors by error type.

**Returns:** `Map<SageErrorType, ValidationError[]>`

## Contributing

When adding new validation rules:

1. Add new error type to `SageErrorType` enum
2. Implement validation function
3. Add to `validateOrdersForExport` batch process
4. Add unit tests
5. Update this README

## Support

For questions or issues:
- Check the examples in `validation-example.ts`
- Review the test suite in `validation.test.ts`
- Consult `/docs/SAGE_PAYMENT_TERMS.md` for business rules

## License

Internal use only - Leora Admin Portal
