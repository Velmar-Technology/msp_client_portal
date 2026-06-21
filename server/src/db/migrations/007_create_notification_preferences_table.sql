-- Migration: Create notification_preferences table
-- Stores per-user channel toggles for each notification event type

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "preferences" jsonb NOT NULL DEFAULT '{
    "TICKET_CREATED":        { "in_app": true, "email": true, "whatsapp": false },
    "TICKET_ASSIGNED":       { "in_app": true, "email": true, "whatsapp": false },
    "TICKET_STATUS_CHANGED": { "in_app": true, "email": true, "whatsapp": true },
    "TICKET_CANCELLED":      { "in_app": true, "email": true, "whatsapp": false },
    "NEW_REPLY":             { "in_app": true, "email": true, "whatsapp": false }
  }',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  UNIQUE("user_id")
);

CREATE INDEX IF NOT EXISTS "idx_notif_prefs_user" ON "notification_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notif_prefs_tenant" ON "notification_preferences" ("tenant_id");
