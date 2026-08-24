#!/usr/bin/env bash
#
# Portainer stack updater wrapper — forwards execution to Node.js runner
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "${SCRIPT_DIR}/portainer-stack-update.js" "$@"
