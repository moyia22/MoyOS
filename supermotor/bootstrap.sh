#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=4545
START_PANEL=1
OPEN_PANEL=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sem-painel) START_PANEL=0 ;;
    --nao-abrir|--não-abrir|--no-open) OPEN_PANEL=0 ;;
    --porta|--port) shift; PORT="${1:-4545}" ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
  shift
done

echo ""
echo "SUPERMOTOR — preparação automática"
echo ""

command -v node >/dev/null 2>&1 || { echo "Node.js 20 ou superior não foi encontrado." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "Git não foi encontrado." >&2; exit 1; }

bash "$ROOT/setup.sh"
node "$ROOT/bin/supermotor.mjs" doctor

if [[ "$START_PANEL" -eq 1 ]]; then
  PANEL_ARGS=("$ROOT/bin/supermotor.mjs" painel iniciar --porta "$PORT")
  if [[ "$OPEN_PANEL" -eq 0 ]]; then PANEL_ARGS+=(--nao-abrir); fi
  node "${PANEL_ARGS[@]}"
fi

echo ""
echo "SUPERMOTOR automatizado com sucesso."
echo ""
