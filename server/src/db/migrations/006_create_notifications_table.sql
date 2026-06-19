-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "link" varchar(500),
  "ticket_id" uuid REFERENCES "tickets"("id") ON DELETE CASCADE,
  "type" varchar(50) NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant" ON "notifications" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications" ("read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" ("created_at");
