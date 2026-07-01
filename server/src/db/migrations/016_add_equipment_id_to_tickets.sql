-- Migration 016: Add equipment_id to tickets table
-- Links a ticket to a specific device (equipment slot) from a subscription

ALTER TABLE tickets
  ADD COLUMN equipment_id UUID REFERENCES subscription_equipment(id) ON DELETE SET NULL;

CREATE INDEX idx_tickets_equipment ON tickets(equipment_id);
