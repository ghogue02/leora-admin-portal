-- Add support for dual-file Sage exports (storage + sample invoices)
ALTER TABLE "SageExport"
ADD COLUMN "sampleRecordCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sampleInvoiceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "storageInvoiceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "fileContent" BYTEA,
ADD COLUMN "sampleFilePath" TEXT,
ADD COLUMN "sampleFileName" TEXT,
ADD COLUMN "sampleFileContent" BYTEA;
