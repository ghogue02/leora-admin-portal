ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "planObjective" text,
  ADD COLUMN IF NOT EXISTS "planNotes" text;
