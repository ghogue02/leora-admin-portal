-- Migration: Add priority and assignedBy fields to Task model
-- Created: 2025-10-19

-- Create TaskPriority enum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Add new columns to Task table
ALTER TABLE "Task"
  ADD COLUMN "assignedById" UUID,
  ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';

-- Add foreign key constraint for assignedBy
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_assignedById_fkey"
  FOREIGN KEY ("assignedById")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Create indexes for better query performance
CREATE INDEX "Task_userId_idx" ON "Task"("userId");
CREATE INDEX "Task_assignedById_idx" ON "Task"("assignedById");

-- Comments for documentation
COMMENT ON COLUMN "Task"."assignedById" IS 'User who assigned this task (typically a manager)';
COMMENT ON COLUMN "Task"."priority" IS 'Task priority level (LOW, MEDIUM, HIGH)';
