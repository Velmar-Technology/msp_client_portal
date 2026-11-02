import { containers, exec } from './papi.mjs';

const cs = await containers(4);
const c = cs.find(x => x.Names.some(n => n.includes('kopia')));
if (!c) { console.error('kopia not found'); process.exit(1); }

const backupScript = `#!/usr/bin/env sh
set -eu

LOG_TAG="[kopia-nextcloud-backup]"
STAGING_DIR="/staging"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="\${STAGING_DIR}/nextcloud_db_\${TIMESTAMP}.sql.gz"
LATEST_DUMP_LINK="\${STAGING_DIR}/nextcloud_db_latest.sql.gz"
DOCKER="/app/config/bin/docker"

NC_CONTAINER="ix-nextcloud-nextcloud-1"
PG_CONTAINER="ix-nextcloud-postgres-1"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') \${LOG_TAG} $*"
}

cleanup() {
  log "Ensuring Nextcloud maintenance mode is turned OFF..."
  "\${DOCKER}" exec "\${NC_CONTAINER}" php occ maintenance:mode --off >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

log "=== Stage 1: Freezing Nextcloud Writes ==="
"\${DOCKER}" exec "\${NC_CONTAINER}" php occ maintenance:mode --on
log "Maintenance mode enabled successfully."

log "=== Stage 2: Streaming Consistent PostgreSQL Dump ==="
mkdir -p "\${STAGING_DIR}"
"\${DOCKER}" exec "\${PG_CONTAINER}" pg_dump -U nextcloud -d nextcloud | gzip -3 > "\${DUMP_FILE}"
ln -sf "\${DUMP_FILE}" "\${LATEST_DUMP_LINK}"
DUMP_SIZE=$(du -h "\${DUMP_FILE}" | cut -f1)
log "Database dump completed: \${DUMP_FILE} (Size: \${DUMP_SIZE})"

log "=== Stage 3: Unfreezing Nextcloud ==="
"\${DOCKER}" exec "\${NC_CONTAINER}" php occ maintenance:mode --off
log "Maintenance mode released. Nextcloud is active."

log "=== Stage 4: Creating Deduplicated Kopia Snapshot ==="
kopia policy set /nextcloud_data \\
  --add-ignore="preview" \\
  --add-ignore="**/preview/**" \\
  --add-ignore="**/cache/**" \\
  --add-ignore="**/.cache/**" \\
  --add-ignore="**/appdata_*/css/**" \\
  --add-ignore="**/appdata_*/js/**" >/dev/null 2>&1 || true

kopia snapshot create \\
  /nextcloud_config \\
  "\${STAGING_DIR}" \\
  /nextcloud_data \\
  --description="Scheduled Nextcloud Atomic Backup \${TIMESTAMP}" \\
  --tags="app:nextcloud,env:production,backup_id:\${TIMESTAMP}"

log "=== Stage 5: Snapshot Maintenance & Cleanup ==="
rm -f "\${DUMP_FILE}" "\${LATEST_DUMP_LINK}"
log "Cleaned up staging database dump."

kopia repository status >/dev/null 2>&1 && log "Kopia repository healthy."

log "=== Backup Pipeline Completed Successfully ==="
`;

const schedulerScript = `#!/usr/bin/env sh
set -eu

echo "[backup-scheduler] Starting backup scheduler daemon (Target: 01:00 PM AST / GMT-4 daily)..."

while true; do
  CURRENT_TIME=$(date '+%H:%M')
  if [ "\${CURRENT_TIME}" = "13:00" ]; then
    echo "[backup-scheduler] Triggering scheduled backup at $(date)..."
    /app/config/backup-nextcloud.sh >> /app/logs/nextcloud-backup.log 2>&1 || true
    echo "[backup-scheduler] Backup finished. Sleeping to prevent re-trigger..."
    sleep 65
  fi
  sleep 30
done
`;

console.log('Writing backup-nextcloud.sh...');
const r1 = await exec(4, c.Id, ['sh', '-c', `cat > /app/config/backup-nextcloud.sh <<'EOF'\n${backupScript}\nEOF\nchmod +x /app/config/backup-nextcloud.sh`]);
console.log('r1 exit:', r1.exitCode);

console.log('Writing backup-scheduler.sh...');
const r2 = await exec(4, c.Id, ['sh', '-c', `cat > /app/config/backup-scheduler.sh <<'EOF'\n${schedulerScript}\nEOF\nchmod +x /app/config/backup-scheduler.sh`]);
console.log('r2 exit:', r2.exitCode);

const r3 = await exec(4, c.Id, ['ls', '-la', '/app/config']);
console.log(r3.stdout);
