-- Migration 028: Add disk_used_gb and disk_total_gb columns to rmm_device_telemetry
ALTER TABLE rmm_device_telemetry ADD COLUMN IF NOT EXISTS disk_used_gb NUMERIC(10,2) DEFAULT 0;
ALTER TABLE rmm_device_telemetry ADD COLUMN IF NOT EXISTS disk_total_gb NUMERIC(10,2) DEFAULT 0;
