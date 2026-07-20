[CmdletBinding()]
param(
  [switch]$SemPainel,
  [switch]$NaoAbrir,
  [ValidateRange(1, 65535)]
  [int]$Porta = 4545
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Cli = Join-Path $Root "bin\supermotor.mjs"

Push-Location $Root
try {
  Write-Host ""
  Write-Host "SUPERMOTOR — preparação automática" -ForegroundColor Cyan
  Write-Host ""

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 20 ou superior não foi encontrado. Instale o Node.js e execute este arquivo novamente."
  }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git não foi encontrado. Instale o Git e execute este arquivo novamente."
  }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "setup.ps1")
  if ($LASTEXITCODE -ne 0) { throw "A preparação do ambiente falhou." }

  & node $Cli doctor
  if ($LASTEXITCODE -ne 0) { throw "O diagnóstico do SUPERMOTOR foi reprovado." }

  if (-not $SemPainel) {
    $panelArgs = @($Cli, "painel", "iniciar", "--porta", [string]$Porta)
    if ($NaoAbrir) { $panelArgs += "--nao-abrir" }
    & node @panelArgs
    if ($LASTEXITCODE -ne 0) { throw "A Control Room não pôde ser iniciada." }
  }

  Write-Host ""
  Write-Host "SUPERMOTOR automatizado com sucesso." -ForegroundColor Green
  Write-Host ""
} finally {
  Pop-Location
}
