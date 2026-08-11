-- Migration 026: Enforce plan catalog integrity on subscriptions

-- 1. Remove the legacy magic default 'PL-001' from subscriptions.plan
ALTER TABLE subscriptions ALTER COLUMN plan DROP DEFAULT;

-- 2. Add foreign key from subscriptions.plan -> plans.id (existing IDs already match)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_plan'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT fk_subscriptions_plan
      FOREIGN KEY (plan) REFERENCES plans(id) ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Drop the dead legacy enum type (converted to varchar in migration 011)
DROP TYPE IF EXISTS subscription_plan;
