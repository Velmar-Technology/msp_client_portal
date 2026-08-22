#!/usr/bin/env bash
#
# Production deployment script — executed on the VPS by the CD workflow.
#
# Resolves the deployment root as one level above this script's directory
# (scripts/ lives inside ~/msp-client-portal, next to docker-compose.prod.yml).
#
# Required environment variables (forwarded by the CD workflow):
#   VERSION           - Image tag to deploy (e.g. 1.5.1)
#   REPOSITORY_OWNER  - Lowercased GitHub owner used in the GHCR image namespace
#   GHCR_USER         - GitHub username for GHCR registry login
#   GHCR_TOKEN        - Ephemeral token with packages:read scope
#
# Optional environment variables:
#   SERVER_CONTAINER  - Server container name (default: msp_server_prod)
#   HEALTH_RETRIES    - Health check attempts (default: 12)
#   HEALTH_INTERVAL   - Seconds between health checks (default: 5)

set -euo pipefail

readonly COMPOSE_FILE="docker-compose.prod.yml"
readonly ROLLBACK_SCRIPT="scripts/rollback.sh"
readonly SERVER_CONTAINER="${SERVER_CONTAINER:-msp_server_prod}"
readonly CLIENT_CONTAINER="${CLIENT_CONTAINER:-msp_client_prod}"
readonly STATE_FILE=".previous_version"
readonly HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
readonly HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

log() { printf '[deploy] %s\n' "$*"; }

require_env() {
  local var="$1"
  if [ -z "${!var:-}" ]; then
    log "ERROR: required environment variable ${var} is not set"
    exit 1
  fi
}

record_rollback_point() {
  local current_image current_tag
  current_image="$(docker inspect "${SERVER_CONTAINER}" --format '{{.Config.Image}}' 2>/dev/null || true)"
  current_tag="${current_image##*:}"
  if [ -n "${current_tag}" ] && [[ "${current_tag}" != *"sha256"* ]] && [ "${current_tag}" != "${current_image}" ]; then
    printf '%s\n' "${current_tag}" > "${STATE_FILE}"
    log "Rollback point recorded: ${current_tag}"
  else
    rm -f "${STATE_FILE}"
    log "No usable rollback point (fresh host or digest-pinned image)"
  fi
}

verify_health() {
  local attempt
  for ((attempt = 1; attempt <= HEALTH_RETRIES; attempt++)); do
    if docker exec "${SERVER_CONTAINER}" node -e \
      "fetch('http://127.0.0.1:3001/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; then
      log "Server API healthy (attempt ${attempt}/${HEALTH_RETRIES})"
      return 0
    fi
    log "Waiting for API health... (${attempt}/${HEALTH_RETRIES})"
    sleep "${HEALTH_INTERVAL}"
  done
  log "ERROR: server failed health verification after ${HEALTH_RETRIES} attempts"
  return 1
}

on_failure() {
  log "Deployment FAILED — attempting automatic rollback"
  bash "${ROLLBACK_SCRIPT}" || log "ERROR: rollback script also failed — manual intervention required"
}

main() {
  require_env VERSION
  require_env REPOSITORY_OWNER
  require_env GHCR_USER
  require_env GHCR_TOKEN

  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  record_rollback_point

  log "Authenticating against GHCR as ${GHCR_USER}"
  printf '%s\n' "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin

  export VERSION REPOSITORY_OWNER
  log "Deploying version ${VERSION} (owner: ${REPOSITORY_OWNER})"

  trap on_failure ERR

  docker compose -f "${COMPOSE_FILE}" pull server client
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans --wait --wait-timeout 180

  verify_health
  trap - ERR

  docker logout ghcr.io >/dev/null 2>&1 || true
  docker image prune -f >/dev/null 2>&1 || true

  log "Deployment of ${VERSION} completed successfully"
}

main "$@"
