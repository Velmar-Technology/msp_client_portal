#!/usr/bin/env sh
set -eu

mkdir -p /app/logs

echo "[backup-scheduler] Starting native Kopia Web UI server daemon on port 51515..."

start_kopia_server() {
  kopia server start \
    --insecure \
    --ui \
    --address="http://0.0.0.0:51515" \
    --without-password \
    --allow-extremely-dangerous-unauthenticated-server-on-the-network \
    >> /app/logs/kopia-server.log 2>&1 &
  KOPIA_PID=$!
  echo "[backup-scheduler] Kopia Web UI started with PID ${KOPIA_PID}."
}

start_kopia_server

echo "[backup-scheduler] Starting multi-service backup scheduler daemon (AST / GMT-4):"
echo "[backup-scheduler]  - Slot 1 (04:00 AM): Nextcloud Stack"
echo "[backup-scheduler]  - Slot 2 (04:30 AM): Core Databases (MSP Portal, MiteFree, Vaultwarden, Services)"
echo "[backup-scheduler]  - Slot 3 (05:00 AM): Infrastructure State & WhatsApp Bots"

while true; do
  # Keep Kopia Web UI alive
  if ! kill -0 "${KOPIA_PID}" 2>/dev/null; then
    echo "[backup-scheduler] WARNING: Kopia server exited. Respawning..."
    start_kopia_server
  fi

  CURRENT_TIME=$(date '+%H:%M')

  # Slot 1: Nextcloud (04:00 AM)
  if [ "${CURRENT_TIME}" = "04:00" ]; then
    echo "[backup-scheduler] Triggering Nextcloud backup at $(date)..."
    /app/config/backup-nextcloud.sh >> /app/logs/nextcloud-backup.log 2>&1 || true
    echo "[backup-scheduler] Nextcloud backup finished. Sleeping to prevent re-trigger..."
    sleep 65
  fi

  # Slot 2: Core Production Databases (04:30 AM)
  if [ "${CURRENT_TIME}" = "04:30" ]; then
    echo "[backup-scheduler] Triggering Core Databases backup at $(date)..."
    /app/config/backup-databases.sh >> /app/logs/databases-backup.log 2>&1 || true
    echo "[backup-scheduler] Core Databases backup finished. Sleeping to prevent re-trigger..."
    sleep 65
  fi

  # Slot 3: State & Infrastructure (05:00 AM)
  if [ "${CURRENT_TIME}" = "05:00" ]; then
    echo "[backup-scheduler] Triggering State & Bots backup at $(date)..."
    /app/config/backup-state.sh >> /app/logs/state-backup.log 2>&1 || true
    echo "[backup-scheduler] State backup finished. Sleeping to prevent re-trigger..."
    sleep 65
  fi

  sleep 30
done
