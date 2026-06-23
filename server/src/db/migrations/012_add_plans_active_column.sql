-- Migration 012: Add active column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL;
