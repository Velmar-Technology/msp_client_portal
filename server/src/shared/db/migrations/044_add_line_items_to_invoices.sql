-- Migration 044: Add line_items jsonb column to invoices table to support granular invoice breakdown and discounts

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS line_items JSONB;
