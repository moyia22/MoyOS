#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MARKER="$ROOT/.supermotor-state/installed.json"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale o Node.js 20 ou superior." >&2
  exit 1
fi

if [[ ! -f "$MARKER" ]]; then
  echo "Primeira execução detectada. Preparando o SUPERMOTOR automaticamente..."
  bash "$ROOT/setup.sh"
fi

node "$ROOT/bin/supermotor.mjs" "$@"
