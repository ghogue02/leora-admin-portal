ALTER TABLE "SampleUsage" ADD COLUMN IF NOT EXISTS "followUpTaskId" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'SampleUsage'
      AND constraint_name = 'SampleUsage_followUpTaskId_fkey'
  ) THEN
    ALTER TABLE "SampleUsage"
      ADD CONSTRAINT "SampleUsage_followUpTaskId_fkey"
      FOREIGN KEY ("followUpTaskId")
      REFERENCES "Task"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
