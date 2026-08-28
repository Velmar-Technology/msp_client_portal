-- Agent-instance binding: ties a physical agent installation (its stable
-- install UUID) to a subscription equipment slot once the device is linked
-- through an agent-issued pairing code.
ALTER TABLE subscription_equipment
  ADD COLUMN IF NOT EXISTS agent_instance_id uuid;

-- Allow many NULLs but keep each bound device unique.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_equip_agent_instance
  ON subscription_equipment (agent_instance_id)
  WHERE agent_instance_id IS NOT NULL;