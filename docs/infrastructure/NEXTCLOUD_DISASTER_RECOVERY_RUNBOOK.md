# Disaster Recovery Runbook: Nextcloud Recovery from Google Drive via Kopia

_Classification: Internal MSP Infrastructure Runbook · Version 1.0 · Target RTO: < 60 mins_

---

## 1. Overview & Disaster Scenarios

This runbook defines the exact procedure to recover the **Nextcloud** service (`https://atlas.velmartech.com.do`) from offsite Google Drive backups in the event of:
1. **Total TrueNAS Hardware Failure** (Motherboard/CPU/Disk failure on `cloud-storage-srv-1`).
2. **TrueNAS Pool Corruption / Ransomware**.
3. **Emergency Cloud Failover** (Spinning up Nextcloud temporarily on the Linode VPS `172.235.145.77`).

---

## 2. Prerequisites & Escrowed Assets

To execute this recovery on a fresh host, ensure you have:
1. **Kopia Repository Password**: Stored in company vault (Bitwarden/1Password).
2. **Google Drive Credentials**: `service-account.json` or authorized Google account.
3. **Target Machine**: Docker + Docker Compose installed (either a replacement TrueNAS host or the Linode VPS).

---

## 3. Step-by-Step Restoration Procedure

### Step 3.1: Connect to the Kopia Repository in Google Drive

On any Linux terminal with `kopia` installed (or inside a temporary Kopia container):

```bash
# Target repository identifiers:
# Folder ID: 0AEn8pZDyL8bSUk9PVA
# Service Account: kopia-backup-agent@msp-portal-501615.iam.gserviceaccount.com

# Set credentials
export KOPIA_PASSWORD="<YOUR_REPOSITORY_PASSPHRASE>"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/gdrive-service-account.json"

# Connect to Google Drive repository
kopia repository connect gdrive \
  --folder-id="0AEn8pZDyL8bSUk9PVA" \
  --credentials-file="/path/to/gdrive-service-account.json"

# List available snapshots to find the latest consistent point-in-time
kopia snapshot list
```

---

### Step 3.2: Restore Nextcloud Files & Database Dump

Create target directories on the recovery server:

```bash
mkdir -p /mnt/recovery/nextcloud/html/config
mkdir -p /mnt/recovery/nextcloud/data
mkdir -p /mnt/recovery/staging_db

# Get the snapshot IDs from Step 3.1
# Restore Nextcloud configuration
kopia snapshot restore <CONFIG_SNAPSHOT_ID> /mnt/recovery/nextcloud/html/config

# Restore Nextcloud user files
kopia snapshot restore <DATA_SNAPSHOT_ID> /mnt/recovery/nextcloud/data

# Restore latest PostgreSQL dump
kopia snapshot restore <STAGING_SNAPSHOT_ID> /mnt/recovery/staging_db
```

---

### Step 3.3: Spin Up Target Containers & Import Database

Create a standard Nextcloud + PostgreSQL 18 compose stack on the recovery server:

```yaml
version: '3.8'
services:
  db:
    image: postgres:18.4-trixie
    restart: always
    environment:
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: <NEW_OR_ORIGINAL_POSTGRES_PW>
    volumes:
      - /mnt/recovery/pgdata:/var/lib/postgresql/data

  nextcloud:
    image: nextcloud:apache
    restart: always
    depends_on:
      - db
    ports:
      - "30027:80"
    volumes:
      - /mnt/recovery/nextcloud/html:/var/www/html
      - /mnt/recovery/nextcloud/data:/var/www/html/data
```

Start the containers and import the PostgreSQL dump:

```bash
docker compose up -d db

# Wait for DB to be healthy, then stream the decompressed SQL dump:
zstd -d -c /mnt/recovery/staging_db/nextcloud_db_*.sql.zst | docker exec -i <CONTAINER_DB_NAME> psql -U nextcloud -d nextcloud

# Start Nextcloud
docker compose up -d nextcloud
```

---

### Step 3.4: Fix Permissions & Run Nextcloud Integrity Repair

Fix filesystem ownership to `www-data` and sync the metadata cache:

```bash
# Correct permissions
docker exec -u 0 <NEXTCLOUD_CONTAINER_NAME> chown -R www-data:www-data /var/www/html/data

# Run Nextcloud post-restore repair routines
docker exec -u www-data <NEXTCLOUD_CONTAINER_NAME> php occ maintenance:repair
docker exec -u www-data <NEXTCLOUD_CONTAINER_NAME> php occ files:scan --all
docker exec -u www-data <NEXTCLOUD_CONTAINER_NAME> php occ maintenance:mode --off
```

---

### Step 3.5: Public Traffic Switchover (Traefik)

1. **If recovered on replacement TrueNAS**:
   - The WireGuard client (`cloud_wg_client`) re-establishes tunnel `10.13.13.3`.
   - Traefik automatically routes `atlas.velmartech.com.do` through Stack 18 (`cloud-gateway`).

2. **If recovered directly on Linode VPS (`172.235.145.77`)**:
   - Update `cloud-gateway` (Stack 18) or Traefik router to proxy `atlas.velmartech.com.do` locally to `http://<recovery-container>:80`.
   - Nextcloud service is live immediately with zero DNS propagation wait.

---

## 4. Verification Checklist

- [ ] `curl -sk https://atlas.velmartech.com.do/status.php` returns HTTP 200 with `{ "installed": true, "maintenance": false }`.
- [ ] Log in with user credentials; verify folders, avatars, and files render properly.
- [ ] WebDAV test: Test upload/download via MSP portal storage quota integration.
