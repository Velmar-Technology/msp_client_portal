#!/usr/bin/env sh
set -eu

# ==============================================================================
# Velmar MSP Communication & Infrastructure State Backup Runner (Kopia + Google Drive)
# Target Slot: 05:00 AM AST (GMT-4)
# Backs up:
# 1. WhatsApp Bot Baileys Session Tokens (vilma_whatsapp_bot, vilma_whatsapp_bot_2, stephanie_whatsapp_bot)
# 2. Pi-hole DNS Configuration (/etc/pihole, /etc/dnsmasq.d)
# ==============================================================================

LOG_TAG="[kopia-state-backup]"
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

log "=== Starting State & Infrastructure Backup (${TIMESTAMP}) ==="

# ------------------------------------------------------------------------------
# 1. WhatsApp Bot Sessions
# ------------------------------------------------------------------------------
log ">>> [1/2] Processing WhatsApp Bots Session Auth State..."
WA_SRC="${SOURCES_DIR}/whatsapp_bots"
rm -rf "${WA_SRC}" && mkdir -p "${WA_SRC}"

log "Archiving vilma_whatsapp_bot session..."
"${DOCKER}" exec vilma_whatsapp_bot tar -czf - -C /app/packages/whatsapp-bot auth_info_baileys > "${WA_SRC}/vilma_bot_${TIMESTAMP}.tar.gz"

log "Archiving vilma_whatsapp_bot_2 session..."
"${DOCKER}" exec vilma_whatsapp_bot_2 tar -czf - -C /app/packages/whatsapp-bot auth_info_baileys > "${WA_SRC}/vilma_bot_2_${TIMESTAMP}.tar.gz"

log "Archiving stephanie_whatsapp_bot session..."
"${DOCKER}" exec stephanie_whatsapp_bot tar -czf - -C /app/packages/whatsapp-bot auth_info_baileys > "${WA_SRC}/stephanie_bot_${TIMESTAMP}.tar.gz"

WA_SIZE=$(du -sh "${WA_SRC}" | cut -f1)
log "WhatsApp sessions archive prepared: ${WA_SIZE}"

log "Creating Kopia snapshot for /sources/whatsapp_bots..."
kopia snapshot create /sources/whatsapp_bots \
  --description="WhatsApp Bots Active Session Auth Tokens ${TIMESTAMP}" \
  --tags="service:whatsapp_bots,type:session_state,backup_id:${TIMESTAMP}"
rm -rf "${WA_SRC}"
log "WhatsApp Bots snapshot completed and staging cleaned."

# ------------------------------------------------------------------------------
# 2. Pi-hole DNS & Configuration
# ------------------------------------------------------------------------------
log ">>> [2/2] Processing Pi-hole Custom Configurations..."
PI_SRC="${SOURCES_DIR}/pihole"
rm -rf "${PI_SRC}" && mkdir -p "${PI_SRC}"

log "Archiving /etc/pihole and /etc/dnsmasq.d..."
"${DOCKER}" exec msp_pihole tar -czf - /etc/pihole /etc/dnsmasq.d > "${PI_SRC}/pihole_${TIMESTAMP}.tar.gz" 2>/dev/null || true

PI_SIZE=$(du -sh "${PI_SRC}" | cut -f1)
log "Pi-hole configuration archive prepared: ${PI_SIZE}"

log "Creating Kopia snapshot for /sources/pihole..."
kopia snapshot create /sources/pihole \
  --description="Pi-hole DNS Config & Custom Records ${TIMESTAMP}" \
  --tags="service:pihole,type:dns,backup_id:${TIMESTAMP}"
rm -rf "${PI_SRC}"
log "Pi-hole snapshot completed and staging cleaned."

# Verify repository connectivity
kopia repository status >/dev/null 2>&1 && log "Kopia repository healthy."

log "=== All Communication & State Components Successfully Backed Up ==="
