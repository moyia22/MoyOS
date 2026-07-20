$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Info($Message) { Write-Host "▶ $Message" -ForegroundColor Cyan }
function Write-Ok($Message)   { Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "! $Message" -ForegroundColor Yellow }
function Write-Fail($Message) { Write-Host "✕ $Message" -ForegroundColor Red }

function Clone-IfMissing($Url, $Dest) {
  if (Test-Path -LiteralPath $Dest) {
    Write-Warn "Já existe: $Dest (pulando)"
    return
  }

  Write-Info "Clonando $Url → $Dest"
  git clone --depth 1 $Url $Dest 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "OK: $Dest"
  } else {
    Write-Fail "Falha ao clonar: $Url"
  }
}

function Download-IfMissing($Url, $Dest) {
  if (Test-Path -LiteralPath $Dest) {
    Write-Warn "Já existe: $Dest (pulando)"
    return
  }

  $Directory = Split-Path $Dest -Parent
  if (-not (Test-Path -LiteralPath $Directory)) {
    New-Item -ItemType Directory -Path $Directory -Force | Out-Null
  }

  Write-Info "Baixando $Dest"
  try {
    Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
    Write-Ok "OK: $Dest"
  } catch {
    Write-Fail "Falha ao baixar: $Url"
  }
}

Write-Host ""
Write-Host "============================================"
Write-Host "  SUPERMOTOR — Inicializando ambiente"
Write-Host "============================================"
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Fail "Git não encontrado. Instale o Git e rode de novo."
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Warn "Node.js não encontrado. O instalador continuará, mas o criador de projetos exige Node.js 20+."
}

New-Item -ItemType Directory -Force -Path libs, skills, ".cursor\rules", ".github", templates, bin, tests, projetos | Out-Null

Write-Info "Baixando bibliotecas (libs/)..."
Clone-IfMissing "https://github.com/pbakaus/impeccable.git"      "libs\impeccable"
Clone-IfMissing "https://github.com/DietrichGebert/ponytail.git" "libs\ponytail"
Clone-IfMissing "https://github.com/fallow-rs/fallow.git"        "libs\fallow"
Clone-IfMissing "https://github.com/Graphify-Labs/graphify.git"  "libs\graphify"
Clone-IfMissing "https://github.com/open-gsd/gsd-core.git"       "libs\gsd-core"
Clone-IfMissing "https://github.com/affaan-m/ECC.git"            "libs\ecc"
Clone-IfMissing "https://github.com/mazzeoia/mazyos.git"         "libs\mazyos"

Write-Host ""
Write-Info "Baixando skills de IA e design (skills/)..."
Clone-IfMissing "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git" "skills\ui-ux-pro-max"
Clone-IfMissing "https://github.com/VoltAgent/awesome-design-md.git"          "skills\awesome-design-md"
Download-IfMissing "https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md" "skills\frontend-design.md"

Write-Host ""
Write-Info "Gerando contexto Mazyos + regras de carrossel..."

$Header = @'
# CONTEXTO DA EMPRESA: MAZYOS

Você está desenvolvendo para a **Mazyos**.
Use o conteúdo abaixo (extraído do repositório oficial) para entender identidade, tom e propósito.

--- INÍCIO DO README DA EMPRESA ---
'@

$Footer = @'

--- FIM DO README DA EMPRESA ---

---

# REGRAS DE GERAÇÃO DE CARROSSÉIS (OBRIGATÓRIO)

Sempre que o usuário pedir carrossel (site, Instagram, LinkedIn etc.), siga exatamente:

## Estrutura narrativa

1. **Slide 1 — Capa/Gancho:** título curto e forte; prender em 2 segundos (pergunta ou afirmação impactante).
2. **Slides 2–4 — Conteúdo:** uma ideia principal por slide; no máximo 3 tópicos; linguagem clara.
3. **Slide 5 — Prova/Exemplo:** caso de uso, resultado ou aplicação prática (preferir contexto Mazyos).
4. **Último slide — CTA:** ação clara (salvar, comentar, clicar, falar no DM etc.).

## Web / código

- Slider com transição suave (`transition: transform 0.5s ease-in-out` ou equivalente).
- Swipe no mobile e setas no desktop.
- Indicadores (bolinhas) na base.
- Respeito à identidade visual da Mazyos (cores, tipografia e respiro).

## Tom

- Profissional e acessível.
- Foco em solução e resultado.
- Evitar jargão desnecessário.
'@

$ReadmeBody = "README da Mazyos não encontrado. Use tom profissional, moderno e focado em resultado."
if (Test-Path -LiteralPath "libs\mazyos\README.md") {
  $ReadmeBody = Get-Content -LiteralPath "libs\mazyos\README.md" -Raw -Encoding UTF8
}

$Context = $Header + "`n" + $ReadmeBody.TrimEnd() + "`n" + $Footer
$Context | Set-Content -LiteralPath "skills\mazyos-master-context.md" -Encoding UTF8
Write-Ok "Contexto gerado: skills\mazyos-master-context.md"

Write-Host ""
Write-Info "Integrando skills com Cursor..."

if (Test-Path -LiteralPath "skills\frontend-design.md") {
  Copy-Item -LiteralPath "skills\frontend-design.md" -Destination ".cursor\rules\frontend-design.md" -Force
}

if (Test-Path -LiteralPath "skills\ui-ux-pro-max\SKILL.md") {
  Copy-Item -LiteralPath "skills\ui-ux-pro-max\SKILL.md" -Destination ".cursor\rules\ui-ux-pro-max.md" -Force
} elseif (Test-Path -LiteralPath "skills\ui-ux-pro-max\README.md") {
  Copy-Item -LiteralPath "skills\ui-ux-pro-max\README.md" -Destination ".cursor\rules\ui-ux-pro-max.md" -Force
}

Copy-Item -LiteralPath "skills\mazyos-master-context.md" -Destination ".cursor\rules\mazyos-master-context.md" -Force
Write-Ok "Skills copiadas para .cursor\rules\"

Write-Host ""
Write-Info "Criando regra global da IA..."

@'
---
description: Regras globais e obrigatórias do Supermotor / Mazyos
globs: "**/*"
alwaysApply: true
---

# OBRIGAÇÕES GLOBAIS

Você é o desenvolvedor sênior deste projeto (stack e identidade **Mazyos**).
Em toda interação e em todo código gerado, use as skills e bibliotecas deste repositório.

## Bibliotecas (pasta `libs/`)

Consulte o README de cada uma antes de reinventar a roda:

| Pasta | Uso |
| --- | --- |
| `libs/impeccable` | UI / CSS — preferir classes e padrões do Impeccable |
| `libs/ponytail` | Ferramentas e utilitários do Ponytail |
| `libs/fallow` | Ferramentas Fallow |
| `libs/graphify` | Obrigatório para gráficos e visualização de dados |
| `libs/gsd-core` | Core e estruturação |
| `libs/ecc` | Lógica / ECC conforme o README do repositório |
| `libs/mazyos` | Código e referência da empresa Mazyos |

## Skills de design e UX

Antes de gerar frontend, leia e aplique:

- `skills/frontend-design.md` (Anthropic)
- `skills/ui-ux-pro-max` (UI/UX Pro Max)
- `skills/awesome-design-md/` (padrões de design system / UI)
- `skills/mazyos-master-context.md` (identidade Mazyos + regras de carrossel)

**Regra de ouro:** nenhum componente visual genérico. Tudo deve estar alinhado à UI/UX Pro Max, Awesome Design e identidade Mazyos.

## Carrosséis

Se pedirem carrossel, siga a estrutura de slides e as regras de swipe/transição em `mazyos-master-context.md` (gancho → conteúdo → exemplo → CTA).

## CRM

Se pedirem CRM, gestão de leads, funil comercial ou relacionamento com clientes, use `https://github.com/frappe/crm` no ramo `main` como fundação. Preserve Frappe/Vue, o remoto oficial como `upstream` e a licença AGPL-3.0; não gere um CRM genérico em Next.js.

## Comportamento

1. Prefira o que já existe em `libs/` e `skills/`.
2. Mantenha o tom e a identidade Mazyos.
3. Se faltar detalhe de marca (cores ou público), assuma um estilo profissional/moderno e pergunte somente o essencial.
4. Em projetos criados pelo motor, leia `PRODUCT.md`, `CONVERSATION.md`, `BRAND.md`, `DESIGN.md`, `SUPERPROMPT.md`, `QUALITY.md` e `.supermotor/AGENT_PROTOCOL.md` antes de implementar.
5. Confirme o favicon, elimine overflow horizontal e mantenha inputs com 16 px ou mais no mobile.
6. Nunca use `user-scalable=no` ou limite o pinch zoom; corrija a causa do problema de escala.
7. Registre início, etapas, testes, bloqueios e conclusão com `node .supermotor/agent.mjs` para alimentar o painel local.
'@ | Set-Content -LiteralPath ".cursor\rules\project-master.mdc" -Encoding UTF8

@'
# Instruções globais — Supermotor / Mazyos

Em clone novo, leia `AUTOMATION.md` e execute o bootstrap automaticamente antes de trabalhar.
Use as bibliotecas em `libs/` (impeccable, ponytail, fallow, graphify, gsd-core, ecc e mazyos).
Para gráficos, use `libs/graphify`.

Siga as skills em `skills/`: frontend-design.md, ui-ux-pro-max, awesome-design-md e mazyos-master-context.md.

Para carrosséis: estrutura gancho → conteúdo → exemplo → CTA, mais as regras de swipe do contexto Mazyos.
Para CRM: use `https://github.com/frappe/crm` no ramo `main`, preserve Frappe/Vue, upstream e AGPL-3.0.
Confirme o favicon e valide o mobile sem overflow ou autozoom de inputs. Preserve o pinch zoom acessível.
Em projetos SUPERMOTOR, leia `CONVERSATION.md` e registre o andamento com `node .supermotor/agent.mjs`.
Sempre prefira os padrões já baixados no projeto em vez de código genérico.
'@ | Set-Content -LiteralPath ".github\copilot-instructions.md" -Encoding UTF8

Write-Ok "Regras da IA configuradas"

$StateDirectory = Join-Path $Root ".supermotor-state"
New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
[ordered]@{
  version = "3.0.0"
  installedAt = (Get-Date).ToUniversalTime().ToString("o")
  platform = "windows"
  node = (node --version)
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $StateDirectory "installed.json") -Encoding UTF8
Write-Ok "Primeira execução registrada"
Write-Host ""
Write-Host "============================================"
Write-Host "  SUPERMOTOR pronto" -ForegroundColor Green
Write-Host "============================================"
Write-Host ""
Write-Host "Pastas criadas/preenchidas:"
Write-Host "  libs/     → impeccable, ponytail, fallow, graphify, gsd-core, ecc, mazyos"
Write-Host "  skills/   → frontend-design, ui-ux-pro-max, awesome-design-md, contexto Mazyos"
Write-Host "  .cursor/  → regras da IA (alwaysApply)"
Write-Host "  .github/  → copilot-instructions.md"
Write-Host ""
Write-Host "Crie um projeto em um comando:"
Write-Host '  .\supermotor.ps1 criar site "Nome do site"'
Write-Host '  .\supermotor.ps1 criar app "Nome do app"'
Write-Host '  .\supermotor.ps1 criar carrossel "Nome do carrossel"'
Write-Host '  .\supermotor.ps1 criar crm "Nome do CRM"'
Write-Host '  .\supermotor.ps1 painel'
Write-Host '  .\supermotor.ps1 validar ".\projetos\nome"'
Write-Host ""
Write-Host "Ou abra o assistente guiado:"
Write-Host '  .\supermotor.ps1'
Write-Host ""
