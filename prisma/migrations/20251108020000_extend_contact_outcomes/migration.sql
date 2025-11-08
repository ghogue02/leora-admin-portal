-- Extend ContactOutcome enum with additional granular statuses used by CARLA UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum e ON e.enumtypid = typ.oid
    WHERE typ.typname = 'ContactOutcome' AND e.enumlabel = 'LEFT_MESSAGE'
  ) THEN
    ALTER TYPE "ContactOutcome" ADD VALUE 'LEFT_MESSAGE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum e ON e.enumtypid = typ.oid
    WHERE typ.typname = 'ContactOutcome' AND e.enumlabel = 'SPOKE_WITH_CONTACT'
  ) THEN
    ALTER TYPE "ContactOutcome" ADD VALUE 'SPOKE_WITH_CONTACT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum e ON e.enumtypid = typ.oid
    WHERE typ.typname = 'ContactOutcome' AND e.enumlabel = 'IN_PERSON_VISIT'
  ) THEN
    ALTER TYPE "ContactOutcome" ADD VALUE 'IN_PERSON_VISIT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum e ON e.enumtypid = typ.oid
    WHERE typ.typname = 'ContactOutcome' AND e.enumlabel = 'EMAIL_SENT'
  ) THEN
    ALTER TYPE "ContactOutcome" ADD VALUE 'EMAIL_SENT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum e ON e.enumtypid = typ.oid
    WHERE typ.typname = 'ContactOutcome' AND e.enumlabel = 'YES'
  ) THEN
    ALTER TYPE "ContactOutcome" ADD VALUE 'YES';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum e ON e.enumtypid = typ.oid
    WHERE typ.typname = 'ContactOutcome' AND e.enumlabel = 'NO'
  ) THEN
    ALTER TYPE "ContactOutcome" ADD VALUE 'NO';
  END IF;
END$$;
