-- Migration 037: Add HELPDESK and AI categories to ticket_category enum
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'HELPDESK';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'AI';
