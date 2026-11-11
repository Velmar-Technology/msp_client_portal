#!/usr/bin/env sh
set -eu

# ==============================================================================
# Velmar MSP Multi-Database Atomic Backup Runner (Kopia + Google Drive)
# Target Slot: 04:30 AM AST (GMT-4)
# Backs up:
# 1. MSP Portal PostgreSQL (msp_helpdesk)
# 2. MiteFree Production PostgreSQL (mitefree)
# 3. Vaultwarden SQLite (db.sqlite3 + rsa_key.pem)
# 4. Service Orders SQLite (services.db)
# ==============================================================================

LOG_TAG="[kopia-db-backup]"
STAGING_DIR="/staging"
SOURCES_DIR="/staging/sources"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DOCKER="/app/config/bin/docker"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') ${LOG_TAG} $*"
}

# Ensure /sources symlink exists so Kopia registers clean source paths in UI
ln -sfn "${SOURCES_DIR}" /sources
mkdir -p "${SOURCES_DIR}"

log "=== Starting Core Production Databases Backup (${TIMESTAMP}) ==="

# ------------------------------------------------------------------------------
# 1. MSP Portal PostgreSQL
# ------------------------------------------------------------------------------
log ">>> [1/4] Processing MSP Portal PostgreSQL..."
MSP_SRC="${SOURCES_DIR}/msp_portal"
rm -rf "${MSP_SRC}" && mkdir -p "${MSP_SRC}"
MSP_DUMP="${MSP_SRC}/msp_helpdesk_${TIMESTAMP}.sql.gz"

log "Streaming compressed pg_dump from msp_postgres_db_prod..."
"${DOCKER}" exec msp_postgres_db_prod pg_dump -U postgres -d msp_helpdesk | gzip -3 > "${MSP_DUMP}"
MSP_SIZE=$(du -h "${MSP_DUMP}" | cut -f1)
log "Dump completed: ${MSP_SIZE}"

log "Creating Kopia snapshot for /sources/msp_portal..."
kopia snapshot create /sources/msp_portal \
  --description="MSP Portal PostgreSQL Database ${TIMESTAMP}" \
  --tags="service:msp_portal,engine:postgres,backup_id:${TIMESTAMP}"
rm -rf "${MSP_SRC}"
log "MSP Portal snapshot completed and staging cleaned."

# ------------------------------------------------------------------------------
# 2. MiteFree Production PostgreSQL
# ------------------------------------------------------------------------------
log ">>> [2/4] Processing MiteFree Production PostgreSQL..."
MITE_SRC="${SOURCES_DIR}/mitefree"
rm -rf "${MITE_SRC}" && mkdir -p "${MITE_SRC}"
MITE_DUMP="${MITE_SRC}/mitefree_${TIMESTAMP}.sql.gz"

log "Streaming compressed pg_dump from mitefree-postgres..."
"${DOCKER}" exec -e PGPASSWORD=mitefree_prod_secure_2026 mitefree-postgres pg_dump -U mitefree -d mitefree | gzip -3 > "${MITE_DUMP}"
MITE_SIZE=$(du -h "${MITE_DUMP}" | cut -f1)
log "Dump completed: ${MITE_SIZE}"

log "Creating Kopia snapshot for /sources/mitefree..."
kopia snapshot create /sources/mitefree \
  --description="MiteFree Production PostgreSQL Database ${TIMESTAMP}" \
  --tags="service:mitefree,engine:postgres,backup_id:${TIMESTAMP}"
rm -rf "${MITE_SRC}"
log "MiteFree snapshot completed and staging cleaned."

# ------------------------------------------------------------------------------
# 3. Vaultwarden SQLite & Encryption Keys
# ------------------------------------------------------------------------------
log ">>> [3/4] Processing Vaultwarden SQLite & Keys..."
VW_SRC="${SOURCES_DIR}/vaultwarden"
rm -rf "${VW_SRC}" && mkdir -p "${VW_SRC}"

log "Executing online non-blocking SQLite backup in msp_vaultwarden..."
"${DOCKER}" exec msp_vaultwarden sqlite3 /data/db.sqlite3 ".backup '/tmp/vault.db'"
"${DOCKER}" exec msp_vaultwarden cat /tmp/vault.db | gzip -3 > "${VW_SRC}/vaultwarden_${TIMESTAMP}.sqlite.gz"
"${DOCKER}" exec msp_vaultwarden cat /data/rsa_key.pem > "${VW_SRC}/rsa_key.pem"
"${DOCKER}" exec msp_vaultwarden rm -f /tmp/vault.db

VW_SIZE=$(du -sh "${VW_SRC}" | cut -f1)
log "Vaultwarden files prepared: ${VW_SIZE}"

log "Creating Kopia snapshot for /sources/vaultwarden..."
kopia snapshot create /sources/vaultwarden \
  --description="Vaultwarden Credentials & RSA Keys ${TIMESTAMP}" \
  --tags="service:vaultwarden,engine:sqlite,backup_id:${TIMESTAMP}"
rm -rf "${VW_SRC}"
log "Vaultwarden snapshot completed and staging cleaned."

# ------------------------------------------------------------------------------
# 4. Service Orders SQLite
# ------------------------------------------------------------------------------
log ">>> [4/4] Processing Service Orders Database..."
SO_SRC="${SOURCES_DIR}/service_orders"
rm -rf "${SO_SRC}" && mkdir -p "${SO_SRC}"

log "Executing Python SQLite backup API in services-app..."
"${DOCKER}" exec services-app python3 -c "import sqlite3; s=sqlite3.connect('/app/data/services.db'); d=sqlite3.connect('/tmp/services.db'); s.backup(d); d.close(); s.close()"
"${DOCKER}" exec services-app cat /tmp/services.db | gzip -3 > "${SO_SRC}/services_${TIMESTAMP}.db.gz"
"${DOCKER}" exec services-app rm -f /tmp/services.db

SO_SIZE=$(du -sh "${SO_SRC}" | cut -f1)
log "Service Orders dump prepared: ${SO_SIZE}"

log "Creating Kopia snapshot for /sources/service_orders..."
kopia snapshot create /sources/service_orders \
  --description="Service Orders Database ${TIMESTAMP}" \
  --tags="service:service_orders,engine:sqlite,backup_id:${TIMESTAMP}"
rm -rf "${SO_SRC}"
log "Service Orders snapshot completed and staging cleaned."

# Verify repository connectivity
kopia repository status >/dev/null 2>&1 && log "Kopia repository healthy."

log "=== All Core Production Databases Successfully Backed Up ==="
