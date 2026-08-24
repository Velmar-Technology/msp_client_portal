#!/usr/bin/env bash
#
# Portainer stack updater — deploys a target version by updating the production
# stack through the Portainer API. Runs on the GitHub Actions runner.
#
# The repo-owned docker-compose.prod.yml is the single source of truth: its
# content is pushed into the stack on every invocation, so any hand-edits made
# in the Portainer editor are overwritten on the next deploy.
#
# Usage:
#   scripts/portainer-stack-update.sh <VERSION>
#
# Required environment variables:
#   PORTAINER_URL         - Base URL (e.g. https://portainer.example.com:9443)
#   PORTAINER_API_KEY     - API key (X-API-Key)
#   PORTAINER_ENDPOINT_ID - Portainer environment ID
#   PORTAINER_STACK_ID    - Target standalone (compose) stack ID
#
# Optional environment variables:
#   PORTAINER_TLS_INSECURE        - "true" to skip TLS verification (self-signed certs)
#   PORTAINER_UPDATE_TIMEOUT_SECS - PUT timeout in seconds (default: 600)

set -euo pipefail

readonly COMPOSE_FILE="docker-compose.prod.yml"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

log() { printf '[portainer] %s\n' "$*"; }

require_env() {
  local var="$1"
  if [ -z "${!var:-}" ]; then
    log "ERROR: required environment variable ${var} is not set"
    exit 1
  fi
}

main() {
  local target_version="${1:-}"
  if [ -z "${target_version}" ]; then
    log "ERROR: usage: $0 <VERSION>"
    exit 1
  fi

  require_env PORTAINER_URL
  require_env PORTAINER_API_KEY
  require_env PORTAINER_ENDPOINT_ID
  require_env PORTAINER_STACK_ID

  if [ ! -f "${REPO_ROOT}/${COMPOSE_FILE}" ]; then
    log "ERROR: ${COMPOSE_FILE} not found at repo root — run from a repo checkout"
    exit 1
  fi

  local base="${PORTAINER_URL%/}"
  local stack_url="${base}/api/stacks/${PORTAINER_STACK_ID}?endpointId=${PORTAINER_ENDPOINT_ID}"

  # Optional TLS verification bypass for self-signed Portainer certificates.
  # Prefer installing a CA-signed cert (e.g. via Traefik + Let's Encrypt) and
  # removing this flag — the API key travels in headers on every call.
  CURL_OPTS=(-sS)
  if [ "${PORTAINER_TLS_INSECURE:-false}" = "true" ]; then
    log "WARNING: TLS certificate verification disabled (PORTAINER_TLS_INSECURE=true)"
    CURL_OPTS+=(-k)
  fi

  # Fetch current stack to preserve its existing environment variables.
  local stack_json
  if ! stack_json="$(curl "${CURL_OPTS[@]}" --max-time 30 -H "X-API-Key: ${PORTAINER_API_KEY}" "${stack_url}")"; then
    log "ERROR: failed to fetch stack ${PORTAINER_STACK_ID} from ${base}"
    exit 1
  fi
  if ! printf '%s' "${stack_json}" | jq -e '.Id' >/dev/null 2>&1; then
    log "ERROR: unexpected stack payload — check PORTAINER_URL / ENDPOINT_ID / STACK_ID and API key scope"
    exit 1
  fi

  # Merge VERSION override, dropping any stale entry first.
  local env_json payload
  env_json="$(printf '%s' "${stack_json}" | jq -c --arg v "${target_version}" \
    '[(.Env // [])[] | select(.name != "VERSION")] + [{name: "VERSION", value: $v}]')"

  payload="$(jq -n \
    --rawfile file "${REPO_ROOT}/${COMPOSE_FILE}" \
    --argjson env "${env_json}" \
    '{stackFileContent: $file, env: $env, prune: true, pullImage: true}')"

  log "Updating stack ${PORTAINER_STACK_ID} to version ${target_version}"

  # Portainer runs the image pull + container recreate synchronously inside the
  # PUT, so the response only arrives once the redeploy finishes. Allow a
  # generous window (default 10 minutes, tunable via PORTAINER_UPDATE_TIMEOUT_SECS).
  local update_timeout="${PORTAINER_UPDATE_TIMEOUT_SECS:-600}"

  local http_code response_file
  response_file="$(mktemp)"
  http_code="$(curl "${CURL_OPTS[@]}" --max-time "${update_timeout}" -o "${response_file}" -w '%{http_code}' \
    -X PUT \
    -H "X-API-Key: ${PORTAINER_API_KEY}" \
    -H "Content-Type: application/json" \
    --data "${payload}" \
    "${stack_url}")"

  if [ "${http_code}" != "200" ]; then
    log "ERROR: Portainer API returned HTTP ${http_code}:"
    cat "${response_file}"
    rm -f "${response_file}"
    exit 1
  fi
  rm -f "${response_file}"

  log "Stack update accepted — Portainer is pulling images and recreating containers"
}

main "$@"
