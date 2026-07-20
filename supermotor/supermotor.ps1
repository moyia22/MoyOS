$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Cli = Join-Path $Root "bin\supermotor.mjs"

$Marker = Join-Path $Root ".supermotor-state\installed.json"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js não encontrado. Instale o Node.js 20 ou superior." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path -LiteralPath $Marker)) {
  Write-Host "Primeira execução detectada. Preparando o SUPERMOTOR automaticamente..." -ForegroundColor Cyan
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "setup.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& node $Cli @args
exit $LASTEXITCODE
