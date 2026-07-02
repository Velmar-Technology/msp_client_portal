-- Add paypal plan id caching columns to plans table
ALTER TABLE plans ADD COLUMN paypal_plan_id_monthly VARCHAR(255);
ALTER TABLE plans ADD COLUMN paypal_plan_id_annual VARCHAR(255);
