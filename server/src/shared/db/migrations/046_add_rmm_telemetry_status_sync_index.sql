-- Migration 046: Add compound performance index on rmm_device_telemetry for stale sweeps
CREATE INDEX IF NOT EXISTS idx_rmm_telemetry_status_sync ON rmm_device_telemetry(agent_status, last_sync_at);
