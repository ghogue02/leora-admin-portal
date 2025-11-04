-- Ensure new prospect statuses exist before data updates rely on them
ALTER TYPE "CustomerRiskStatus" ADD VALUE IF NOT EXISTS 'PROSPECT';
ALTER TYPE "CustomerRiskStatus" ADD VALUE IF NOT EXISTS 'PROSPECT_COLD';
