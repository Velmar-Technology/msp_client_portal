-- Migration: 043_add_ticket_response_is_internal.sql
-- Description: Add is_internal boolean flag to ticket_responses to support technician internal notes

ALTER TABLE "ticket_responses"
ADD COLUMN IF NOT EXISTS "is_internal" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_responses_is_internal" ON "ticket_responses" ("is_internal");
