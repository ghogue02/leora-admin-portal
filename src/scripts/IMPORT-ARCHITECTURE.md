# HAL Import Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HAL Import System                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  HAL Export  │────▶│Import Script │────▶│  PostgreSQL  │
│  JSON File   │     │  (tsx)       │     │   Database   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            │ Progress
                            ▼
                     ┌──────────────┐
                     │  Checkpoint  │
                     │   Storage    │
                     └──────────────┘
                            │
                            │ Report
                            ▼
                     ┌──────────────┐
                     │Import Report │
                     │    (JSON)    │
                     └──────────────┘
                            │
                            │ Optional
                            ▼
                     ┌──────────────┐
                     │   Rollback   │
                     │    Script    │
                     └──────────────┘
```

## 📊 Data Flow Pipeline

### Phase 1: Load & Validate
```
HAL JSON File
    │
    ├─▶ Parse JSON
    ├─▶ Validate structure
    ├─▶ Extract products array
    └─▶ Count total products
```

### Phase 2: Batch Processing
```
Products Array (1,904 items)
    │
    ├─▶ Split into batches (100 each)
    │   ├─▶ Batch 1: Products 1-100
    │   ├─▶ Batch 2: Products 101-200
    │   └─▶ ... (19 batches)
    │
    └─▶ Process each batch in transaction
        ├─▶ BEGIN TRANSACTION
        ├─▶ Process 100 products
        ├─▶ COMMIT (or ROLLBACK on error)
        └─▶ Save checkpoint
```

### Phase 3: Product Processing
```
For each HAL product:
    │
    ├─▶ 1. Find existing SKU in database
    │   └─▶ Skip if not found (safety rule)
    │
    ├─▶ 2. Check for vintage variant
    │   ├─▶ Extract vintage from name
    │   ├─▶ Compare with DB product vintage
    │   └─▶ Create variant if different
    │
    ├─▶ 3. Update Product fields
    │   ├─▶ description
    │   ├─▶ manufacturer
    │   └─▶ abcCode
    │
    ├─▶ 4. Update SKU fields
    │   ├─▶ abv (from labelAlcohol)
    │   ├─▶ itemsPerCase
    │   ├─▶ bottleBarcode
    │   └─▶ abcCodeNumber
    │
    ├─▶ 5. Handle Supplier
    │   ├─▶ Find or create supplier
    │   └─▶ Link to product
    │
    └─▶ 6. Create/Update Inventory
        ├─▶ Parse warehouse location
        ├─▶ Extract aisle/row/shelf
        └─▶ Create or update record
```

## 🔄 Transaction Flow

### Successful Batch
```
┌─────────────────────────────────────────┐
│ Transaction Scope (100 products)        │
├─────────────────────────────────────────┤
│                                         │
│  Product 1  ──▶ Update Product         │
│             ──▶ Update SKU             │
│             ──▶ Create Inventory       │
│                                         │
│  Product 2  ──▶ Create Variant SKU     │
│             ──▶ Create Product         │
│             ──▶ Create Inventory       │
│                                         │
│  ...                                    │
│                                         │
│  Product 100 ──▶ Update Product        │
│              ──▶ Update SKU            │
│                                         │
└─────────────────────────────────────────┘
         │
         │ All operations succeed
         ▼
    COMMIT ✅
         │
         ▼
  Save Checkpoint
```

### Failed Batch
```
┌─────────────────────────────────────────┐
│ Transaction Scope (100 products)        │
├─────────────────────────────────────────┤
│                                         │
│  Product 1  ──▶ Update Product ✅      │
│             ──▶ Update SKU ✅          │
│                                         │
│  Product 2  ──▶ Update Product ✅      │
│             ──▶ Update SKU ✅          │
│                                         │
│  Product 3  ──▶ Update Product ✅      │
│             ──▶ Create Inventory ❌    │
│                 (constraint violation)  │
│                                         │
└─────────────────────────────────────────┘
         │
         │ Error encountered
         ▼
   ROLLBACK 🔄
         │
         ▼
  Products 1-2 changes reverted
  Error logged
  Continue to next batch
```

## 🎯 Vintage Variant Logic

### Decision Tree
```
HAL Product Name: "Abadia de Acon Joven 2023"
SKU: "SPA1072"
    │
    ├─▶ Extract vintage: 2023
    │
    ├─▶ Find existing SKU "SPA1072"
    │   └─▶ Get linked Product
    │       └─▶ Current vintage: 2022
    │
    ├─▶ Vintage mismatch detected (2023 ≠ 2022)
    │
    ├─▶ Generate variant SKU: "SPA1072-2023"
    │
    ├─▶ Check if variant exists
    │   ├─▶ Yes: Use existing variant
    │   └─▶ No: Create new variant
    │       ├─▶ Create Product (vintage: 2023)
    │       └─▶ Create SKU (code: "SPA1072-2023")
    │
    └─▶ Update variant with HAL data
```

### Variant Creation Example
```
Original Product:
    - ID: abc-123
    - Name: "Abadia de Acon Joven"
    - Vintage: 2022
    - SKU: "SPA1072"

HAL Product:
    - Name: "Abadia de Acon Joven 2023"
    - SKU: "SPA1072"

Result:
    New Product:
        - ID: def-456
        - Name: "Abadia de Acon Joven 2023"
        - Vintage: 2023
        - SKU: "SPA1072-2023"

Both products coexist in database
```

## 📍 Checkpoint System

### Checkpoint File Structure
```json
{
  "lastProcessedIndex": 199,
  "timestamp": "2025-11-15T12:34:56.789Z",
  "stats": {
    "totalProcessed": 200,
    "productsUpdated": 87,
    "skusUpdated": 156,
    "variantsCreated": 12,
    "suppliersCreated": 3,
    "inventoryCreated": 189,
    "inventoryUpdated": 11,
    "errors": 0,
    "skipped": 0,
    "batchesCompleted": 2
  }
}
```

### Checkpoint Workflow
```
Batch 1 Complete (products 0-99)
    │
    ├─▶ Save checkpoint
    │   └─▶ lastProcessedIndex: 99
    │
Batch 2 Complete (products 100-199)
    │
    ├─▶ Update checkpoint
    │   └─▶ lastProcessedIndex: 199
    │
[INTERRUPTION - Process crashes]
    │
Resume with --resume flag
    │
    ├─▶ Load checkpoint
    ├─▶ lastProcessedIndex: 199
    └─▶ Start at index 200 (Batch 3)
```

## 🔙 Rollback Architecture

### What Can Be Rolled Back
```
Reversible Operations:
    ├─▶ Variant SKU Creation
    │   ├─▶ Delete variant SKU
    │   └─▶ Delete variant Product (if no other SKUs)
    │
    ├─▶ Supplier Creation
    │   └─▶ Delete supplier (if no products linked)
    │
    └─▶ Inventory Creation
        └─▶ Delete inventory records

Non-Reversible Operations:
    ├─▶ Product Updates (no "before" snapshot)
    ├─▶ SKU Updates (no "before" snapshot)
    └─▶ Supplier Links (no previous state stored)
```

### Rollback Process
```
Load Import Report
    │
    ├─▶ Read updates array
    │
    ├─▶ Reverse order iteration
    │   └─▶ Process newest changes first
    │
    ├─▶ For each update:
    │   ├─▶ variant_created: Delete SKU + Product
    │   ├─▶ supplier_created: Delete Supplier (if safe)
    │   └─▶ Other actions: Skip (cannot reverse)
    │
    └─▶ Report rollback statistics
```

## 🗂️ Database Schema Relations

### Entity Relationships
```
┌──────────────┐
│   Tenant     │
└──────┬───────┘
       │ 1:N
       ├─────────────┬─────────────┬─────────────┐
       │             │             │             │
       ▼             ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Supplier │  │ Product  │  │   SKU    │  │Inventory │
└──────────┘  └────┬─────┘  └────┬─────┘  └──────────┘
       │           │             │             │
       │ 1:N       │ 1:N         │ 1:N         │
       └───────────┴─────────────┴─────────────┘
```

### Key Constraints
```
Product:
    - tenantId (FK → Tenant)
    - supplierId (FK → Supplier, nullable)

SKU:
    - tenantId (FK → Tenant)
    - productId (FK → Product)
    - code (unique per tenant)

Inventory:
    - tenantId (FK → Tenant)
    - skuId (FK → SKU)
    - location (string)
    - UNIQUE(tenantId, skuId, location)

Supplier:
    - tenantId (FK → Tenant)
    - name (unique per tenant)
```

## 📈 Performance Characteristics

### Batch Size Impact
```
Batch Size 50:
    ✅ Faster failure recovery
    ✅ Lower memory usage
    ❌ More database round-trips
    ❌ Slower overall import

Batch Size 100 (default):
    ✅ Good balance
    ✅ Reasonable transaction size
    ✅ Manageable memory

Batch Size 200:
    ✅ Faster overall import
    ❌ Longer transactions (timeout risk)
    ❌ More work lost on failure
```

### Expected Performance
```
Typical Import (1,904 products):
    - Batch Size: 100
    - Total Batches: 20
    - Time per Batch: ~6 seconds
    - Total Time: ~2 minutes
    - Database Writes: ~7,000-10,000

Memory Usage:
    - Per Batch: ~50 MB
    - Peak: ~100 MB
    - Checkpoint: < 1 KB
```

## 🔒 Safety Mechanisms

### Transaction Isolation
```
Read Committed Isolation Level
    ├─▶ Each batch sees committed data only
    ├─▶ No dirty reads
    ├─▶ Concurrent imports safe (different batches)
    └─▶ Automatic rollback on error
```

### Validation Layers
```
Layer 1: Schema Validation
    └─▶ Prisma enforces field types

Layer 2: Business Logic
    ├─▶ SKU must exist
    ├─▶ Supplier name required
    └─▶ Quantity must be non-negative

Layer 3: Database Constraints
    ├─▶ Foreign key enforcement
    ├─▶ Unique constraints
    └─▶ NOT NULL constraints
```

### Error Handling
```
Batch Processing:
    ├─▶ Error in Product 1-99: Rollback batch, skip to next
    ├─▶ Error in Product 50: All changes in batch reverted
    └─▶ Continue with next batch (resilient)

Transaction Failures:
    ├─▶ Deadlock: Automatic retry
    ├─▶ Constraint violation: Log and skip batch
    └─▶ Timeout: Reduce batch size recommendation
```

## 🎓 Best Practices

### Import Workflow
```
1. Validate Environment
    └─▶ Run test-import-setup.ts

2. Backup Database
    └─▶ pg_dump before import

3. Dry Run
    └─▶ Preview all changes

4. Import with Report
    └─▶ Save report for rollback

5. Verify Results
    └─▶ Check import summary

6. Monitor Production
    └─▶ Watch for issues
```

### Error Recovery
```
Minor Errors (< 5%):
    └─▶ Review error log
    └─▶ Fix data and re-import failed items

Major Errors (> 10%):
    └─▶ Stop import
    └─▶ Investigate root cause
    └─▶ Consider rollback

Complete Failure:
    └─▶ Restore from backup
    └─▶ Fix script/data
    └─▶ Start over
```

## 🔬 Technical Details

### Technology Stack
- **Runtime**: Node.js + TypeScript (tsx)
- **ORM**: Prisma Client
- **Database**: PostgreSQL (Supabase)
- **Transaction**: Read Committed isolation
- **Parsing**: Native JSON.parse

### File Dependencies
```
import-hal-data.ts
    ├─▶ @prisma/client (ORM)
    ├─▶ fs (file operations)
    ├─▶ path (file paths)
    └─▶ prisma/schema.prisma (schema)

rollback-hal-import.ts
    ├─▶ @prisma/client
    ├─▶ fs
    └─▶ Import report JSON

test-import-setup.ts
    ├─▶ @prisma/client
    ├─▶ fs
    └─▶ HAL data JSON
```

### Code Organization
```
src/scripts/
    ├─▶ import-hal-data.ts
    │   ├─▶ Types & Interfaces (200 lines)
    │   ├─▶ Utility Functions (150 lines)
    │   ├─▶ Import Logic (400 lines)
    │   └─▶ Main Execution (100 lines)
    │
    ├─▶ rollback-hal-import.ts
    │   ├─▶ Types (50 lines)
    │   ├─▶ Rollback Logic (150 lines)
    │   └─▶ Main Execution (50 lines)
    │
    └─▶ test-import-setup.ts
        ├─▶ Validation Tests (200 lines)
        └─▶ Reporting (100 lines)

Total: ~1,500 lines of production-ready TypeScript
```

---

## 📚 Further Reading

- **User Guide**: `README-HAL-IMPORT.md` - Complete documentation
- **Quick Start**: `IMPORT-QUICK-START.md` - Fast getting started
- **This File**: `IMPORT-ARCHITECTURE.md` - Technical deep dive
- **Prisma Schema**: `prisma/schema.prisma` - Database schema
