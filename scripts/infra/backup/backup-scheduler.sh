#!/usr/bin/env sh
set -eu

# Lightweight background scheduler loop for TrueNAS container
echo "[backup-scheduler] Starting backup scheduler daemon (Target: 01:00 PM AST / GMT-4 daily)..."

while true; do
  CURRENT_TIME=$(date '+%H:%M')
  if [ "${CURRENT_TIME}" = "13:00" ]; then
    echo "[backup-scheduler] Triggering scheduled backup at $(date)..."
    /usr/local/bin/backup-nextcloud.sh >> /var/log/nextcloud-backup.log 2>&1 || true
    echo "[backup-scheduler] Backup finished. Sleeping to prevent re-trigger..."
    sleep 65
  fi
  sleep 30
done
