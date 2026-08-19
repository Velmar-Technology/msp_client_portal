-- Migration 024: Add last_email_sent_at to invoices table to track due payment notification frequency
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE;
