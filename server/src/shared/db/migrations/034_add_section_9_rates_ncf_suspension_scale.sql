-- 034_add_section_9_rates_ncf_suspension_scale.sql

-- 1. Create account_status enum type if it does not exist
DO $$ BEGIN
  CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'READ_ONLY', 'SUSPENDED', 'PURGED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Alter tenants table
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS rnc VARCHAR(50),
  ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS read_only_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;

-- 3. Alter users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS rnc VARCHAR(50);

-- 4. Alter invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS ncf VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rnc VARCHAR(50);

-- 5. Add index on invoices NCF for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_ncf ON invoices(ncf);
