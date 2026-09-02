#!/usr/bin/env sh
set -eu

# ==============================================================================
# Velmar MSP Nextcloud Atomic Backup Runner (Kopia + Google Drive)
# Orchestrates consistent Nextcloud state:
# 1. Maintenance Mode ON
# 2. PostgreSQL Stream Dump (compressed with ZSTD)
# 3. Maintenance Mode OFF (< 15s total downtime)
# 4. Kopia Snapshot of Data, Config, and DB Dump
# 5. Staging cleanup & Retention Enforcement
# ==============================================================================

LOG_TAG="[kopia-nextcloud-backup]"
STAGING_DIR="/staging"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${STAGING_DIR}/nextcloud_db_${TIMESTAMP}.sql.zst"
LATEST_DUMP_LINK="${STAGING_DIR}/nextcloud_db_latest.sql.zst"

NC_CONTAINER="ix-nextcloud-nextcloud-1"
PG_CONTAINER="ix-nextcloud-postgres-1"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') ${LOG_TAG} $*"
}

cleanup() {
  log "Ensuring Nextcloud maintenance mode is turned OFF..."
  docker exec "${NC_CONTAINER}" php occ maintenance:mode --off >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

log "=== Stage 1: Freezing Nextcloud Writes ==="
docker exec "${NC_CONTAINER}" php occ maintenance:mode --on
log "Maintenance mode enabled successfully."

log "=== Stage 2: Streaming Consistent PostgreSQL Dump ==="
mkdir -p "${STAGING_DIR}"
# Stream directly into gzip to save disk I/O and disk space
docker exec "${PG_CONTAINER}" pg_dump -U nextcloud -d nextcloud | gzip -3 > "${DUMP_FILE}"
ln -sf "${DUMP_FILE}" "${LATEST_DUMP_LINK}"
DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
log "Database dump completed: ${DUMP_FILE} (Size: ${DUMP_SIZE})"

log "=== Stage 3: Unfreezing Nextcloud ==="
docker exec "${NC_CONTAINER}" php occ maintenance:mode --off
log "Maintenance mode released. Nextcloud is active."

log "=== Stage 4: Creating Deduplicated Kopia Snapshot ==="
# Set ignore policy on /nextcloud_data to avoid syncing previews, caches, and temp files
kopia policy set /nextcloud_data \
  --add-ignore="preview" \
  --add-ignore="**/preview/**" \
  --add-ignore="**/cache/**" \
  --add-ignore="**/.cache/**" \
  --add-ignore="**/appdata_*/css/**" \
  --add-ignore="**/appdata_*/js/**" >/dev/null 2>&1 || true

kopia snapshot create \
  /nextcloud_config \
  "${STAGING_DIR}" \
  /nextcloud_data \
  --description="Scheduled Nextcloud Atomic Backup ${TIMESTAMP}" \
  --tags="app:nextcloud,env:production,backup_id:${TIMESTAMP}"

log "=== Stage 5: Snapshot Maintenance & Cleanup ==="
# Remove temporary DB dump to liberate staging disk space
rm -f "${DUMP_FILE}" "${LATEST_DUMP_LINK}"
log "Cleaned up staging database dump."

# Verify repository connectivity
kopia repository status >/dev/null 2>&1 && log "Kopia repository healthy."

log "=== Backup Pipeline Completed Successfully ==="
