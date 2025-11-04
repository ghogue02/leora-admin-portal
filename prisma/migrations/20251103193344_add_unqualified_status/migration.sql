-- Add UNQUALIFIED to CustomerRiskStatus enum for abandoned prospect accounts
ALTER TYPE "CustomerRiskStatus" ADD VALUE IF NOT EXISTS 'UNQUALIFIED';
