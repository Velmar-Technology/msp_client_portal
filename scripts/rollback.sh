#!/usr/bin/env bash
#
# Rollback script — re-deploys the last known-good version recorded by deploy.sh.
# Runs on the VPS inside ~/msp-client-portal/scripts. Invoked automatically on
# deploy failure, or manually from the repo root: VERSION=1.5.0 scripts/rollback.sh
#
# Optional environment variables:
#   VERSION           - Explicit version to roll back to (overrides state file)
#   REPOSITORY_OWNER  - Lowercased GHCR namespace owner
#   GHCR_USER         - GitHub username for GHCR login (re-auth if provided)
#   GHCR_TOKEN        - GitHub token for GHCR login (re-auth if provided)

set -euo pipefail

readonly COMPOSE_FILE="docker-compose.prod.yml"
readonly STATE_FILE=".previous_version"

log() { printf '[rollback] %s\n' "$*"; }

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    log "ERROR: Docker Compose not found on this host"
    log "Install the v2 plugin: sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
    exit 1
  fi
  log "Using compose command: ${COMPOSE[*]}"
}

main() {
  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  detect_compose

  local target="${VERSION:-}"
  if [ -z "${target}" ]; then
    if [ ! -s "${STATE_FILE}" ]; then
      log "No rollback point found (${STATE_FILE} missing or empty) — nothing to do"
      exit 0
    fi
    target="$(cat "${STATE_FILE}")"
  fi

  if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
    log "Re-authenticating against GHCR"
    printf '%s\n' "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
  fi

  : "${REPOSITORY_OWNER:=velmar-technology}"
  export VERSION="${target}" REPOSITORY_OWNER

  log "Rolling back to version ${target}"
  "${COMPOSE[@]}" -f "${COMPOSE_FILE}" pull server client
  "${COMPOSE[@]}" -f "${COMPOSE_FILE}" up -d --remove-orphans --wait --wait-timeout 180

  log "Rollback to ${target} completed"
}

main "$@"
