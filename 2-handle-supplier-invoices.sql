-- MOVE SUPPLIER INVOICES TO SEPARATE TABLE
-- Run this SECOND

BEGIN;

-- Create SupplierInvoices table
CREATE TABLE IF NOT EXISTS "SupplierInvoices" (
  id BIGSERIAL PRIMARY KEY,
  "referenceNumber" INTEGER UNIQUE,
  "invoiceNumber" TEXT,
  "invoiceDate" TEXT,
  total DECIMAL(12,2),
  "supplierName" TEXT,
  "itemCount" INTEGER,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add invoice_type column to ImportedInvoices
ALTER TABLE "ImportedInvoices" ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'customer_sale';

-- Move supplier invoices
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174495, '174495', '', 2891, 'Soil Expedition Co.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174497, '174497', '', 28488, 'MYS WINES INC', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174498, '174498', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174499, '174499', '', 23367, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174500, '174500', '', 4.25, 'JAMES A YAEGER INC', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174501, '174501', '', 14.5, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174502, '174502', '', 5.17, 'Point Seven', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174504, '174504', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174505, '174505', '', 52, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174506, '174506', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174507, '174507', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174508, '174508', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174509, '174509', '', 16172.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174512, '174512', '', 28289, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174513, '174513', '', 3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174516, '174516', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174540, '174540', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174617, '174617', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174618, '174618', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174619, '174619', '', 23583, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174620, '174620', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174622, '174622', '', 28512, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174624, '174624', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174665, '174665', '', 7.5, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174748, '174748', '', 1338, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174751, '174751', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174752, '174752', '', 6043, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174832, '174832', '', 3, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174844, '174844', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174845, '174845', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174857, '174857', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174858, '174858', '', 3808, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174945, '174945', '', 2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174946, '174946', '', 1421, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174950, '174950', '', 96.6, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174951, '174951', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174952, '174952', '', 1897, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174957, '174957', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174959, '174959', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174960, '174960', '', 6616, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174984, '174984', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174985, '174985', '', 9075, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174995, '174995', '', 52, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174996, '174996', '', 156.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174997, '174997', '', 52, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174998, '174998', '', 210, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (174999, '174999', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175000, '175000', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175001, '175001', '', 31808, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175005, '175005', '', 2986.2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175006, '175006', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175007, '175007', '', 3390.02, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175009, '175009', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175017, '175017', '', 7366.92, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175026, '175026', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175028, '175028', '', 23583, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175033, '175033', '', 1322, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175044, '175044', '', 28992, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175150, '175150', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175187, '175187', '', 1.83, 'Soil Expedition Co Samples', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175234, '175234', '', 1266.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175243, '175243', '', 1, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175257, '175257', '', 2369, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175263, '175263', '', 1506, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175264, '175264', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175265, '175265', '', 138, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175266, '175266', '', 1506, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175268, '175268', '', 5, 'JAMES A YAEGER INC', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175356, '175356', '', 67068, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175362, '175362', '', 28289, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175379, '175379', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175380, '175380', '', 1322, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175462, '175462', '', 1421, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175465, '175465', '', 88.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175466, '175466', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175468, '175468', '', 186, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175472, '175472', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175474, '175474', '', 48.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175475, '175475', '', 1334.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175476, '175476', '', 161, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175479, '175479', '', 1012.81, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175480, '175480', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175481, '175481', '', 6329, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175505, '175505', '', 200.61, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175506, '175506', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175507, '175507', '', 16597, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175511, '175511', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175512, '175512', '', 166, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175513, '175513', '', 314.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175518, '175518', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175519, '175519', '', 19459, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175522, '175522', '', 2891, 'Soil Expedition Co.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175530, '175530', '', 20134, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175536, '175536', '', 28512, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175545, '175545', '', 1266.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175624, '175624', '', 3.33, 'Soil Expedition Co Samples', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175651, '175651', '', 28511, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175652, '175652', '', 1145.99, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175653, '175653', '', 25010, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175655, '175655', '', 2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175749, '175749', '', 1198.78, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175750, '175750', '', 0.5, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175757, '175757', '', 15, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175785, '175785', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175786, '175786', '', 8294, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175881, '175881', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175882, '175882', '', 5345.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175885, '175885', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175891, '175891', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175892, '175892', '', 5666, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175992, '175992', '', 28490, 'Kily Import', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175993, '175993', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175994, '175994', '', 21520, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (175997, '175997', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176008, '176008', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176009, '176009', '', 6074, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176025, '176025', '', 30045, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176026, '176026', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176027, '176027', '', 5332, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176036, '176036', '', 28907, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176037, '176037', '', 208.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176038, '176038', '', 156.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176039, '176039', '', 25308, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176040, '176040', '', 106, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176041, '176041', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176043, '176043', '', 52, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176044, '176044', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176045, '176045', '', 18034.2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176060, '176060', '', 21520, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176061, '176061', '', 186, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176089, '176089', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176090, '176090', '', 3345, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176194, '176194', '', 186, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176195, '176195', '', 2752.78, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176196, '176196', '', 20134, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176198, '176198', '', 3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176207, '176207', '', 5.17, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176356, '176356', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176366, '176366', '', 4006.82, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176367, '176367', '', 6, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176398, '176398', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176399, '176399', '', 1706, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176489, '176489', '', 28512, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176491, '176491', '', 28511, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176504, '176504', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176505, '176505', '', 6758, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176506, '176506', '', 28289, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176605, '176605', '', 23479, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176607, '176607', '', 5327.9, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176616, '176616', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176621, '176621', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176622, '176622', '', 52, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176623, '176623', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176624, '176624', '', 148.6, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176625, '176625', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176627, '176627', '', 199, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176629, '176629', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176630, '176630', '', 12062, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176659, '176659', '', 5.83, 'Point Seven', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176666, '176666', '', 186, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176667, '176667', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176668, '176668', '', 14083, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176674, '176674', '', 28907, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176675, '176675', '', 104.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176676, '176676', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176677, '176677', '', 262, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176678, '176678', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176679, '176679', '', 158, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176680, '176680', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176681, '176681', '', 26183, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176682, '176682', '', 1248.07, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176684, '176684', '', 28512, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176689, '176689', '', 29022, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176690, '176690', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176691, '176691', '', 1950.01, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176696, '176696', '', 28512, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176700, '176700', '', 2891, 'Soil Expedition Co.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176719, '176719', '', 3, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176736, '176736', '', 0.33, 'Point Seven', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176737, '176737', '', 16.5, 'Point Seven', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176781, '176781', '', 4, 'JAMES A YAEGER INC', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176803, '176803', '', 11555.98, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176804, '176804', '', 11, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176805, '176805', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176806, '176806', '', 13445.96, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176807, '176807', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176808, '176808', '', 6743.99, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176809, '176809', '', 4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176810, '176810', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176811, '176811', '', 28511, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176812, '176812', '', 7, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176813, '176813', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176819, '176819', '', 3102.03, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176822, '176822', '', 1198.78, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176824, '176824', '', 29022, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176825, '176825', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176836, '176836', '', 6, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176887, '176887', '', 3.5, 'Soil Expedition Co Samples', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176921, '176921', '', 4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176931, '176931', '', 2892.07, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176944, '176944', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176945, '176945', '', 7738.8, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (176947, '176947', '', 2892.07, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177028, '177028', '', 0.67, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177030, '177030', '', 7424.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177031, '177031', '', 5568.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177032, '177032', '', 3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177033, '177033', '', 7424.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177034, '177034', '', 3712.2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177035, '177035', '', 5568.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177036, '177036', '', 3712.2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177037, '177037', '', 1856.1, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177038, '177038', '', 16704.9, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177039, '177039', '', 5568.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177040, '177040', '', 14848.8, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177041, '177041', '', 5568.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177042, '177042', '', 5568.3, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177043, '177043', '', 7424.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177044, '177044', '', 11136.6, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177045, '177045', '', 7, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177051, '177051', '', 1, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177056, '177056', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177057, '177057', '', 15485, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177127, '177127', '', 596.99, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177128, '177128', '', 1421, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177135, '177135', '', 158, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177136, '177136', '', 28907, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177138, '177138', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177140, '177140', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177141, '177141', '', 11853, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177196, '177196', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177197, '177197', '', 21249.4, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177205, '177205', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177206, '177206', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177207, '177207', '', 28907, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177208, '177208', '', 28907, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177209, '177209', '', 29007, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177210, '177210', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177211, '177211', '', 22774, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177216, '177216', '', 28512, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177218, '177218', '', 1319.97, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177223, '177223', '', 6398.97, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177244, '177244', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177325, '177325', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177326, '177326', '', 21811, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177327, '177327', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177329, '177329', '', 1476, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177330, '177330', '', 1476, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177335, '177335', '', 1476, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177336, '177336', '', 1, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177387, '177387', '', 5, 'CSEN Inc.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177435, '177435', '', 1481, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177440, '177440', '', 23911, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177443, '177443', '', 20416.2, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177455, '177455', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177456, '177456', '', 4541, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177478, '177478', '', 3.92, 'Soil Expedition Co Samples', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177551, '177551', '', 1, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177552, '177552', '', 3021.53, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177553, '177553', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177554, '177554', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177612, '177612', '', 0, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177613, '177613', '', 7453, 'Noble Hill Wines Pty. Ltd.', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
VALUES (177685, '177685', '', 1.08, 'Soil Expedition Co Samples', 0)
ON CONFLICT ("referenceNumber") DO NOTHING;

-- Mark as supplier invoices in staging
UPDATE "ImportedInvoices"
SET invoice_type = 'supplier_purchase'
WHERE "referenceNumber" IN (SELECT "referenceNumber" FROM "SupplierInvoices");

COMMIT;

-- 264 supplier invoices moved
SELECT COUNT(*) FROM "SupplierInvoices";