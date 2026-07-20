#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}▶${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✕${NC} $1"; }

clone_if_missing() {
  local url="$1"
  local dest="$2"

  if [ -d "$dest" ]; then
    warn "Já existe: $dest (pulando)"
    return 0
  fi

  info "Clonando $url → $dest"
  if git clone --depth 1 "$url" "$dest" 2>/dev/null; then
    ok "OK: $dest"
  else
    fail "Falha ao clonar: $url"
  fi
}

download_if_missing() {
  local url="$1"
  local dest="$2"

  if [ -f "$dest" ]; then
    warn "Já existe: $dest (pulando)"
    return 0
  fi

  info "Baixando $dest"
  mkdir -p "$(dirname "$dest")"

  if command -v curl >/dev/null 2>&1; then
    if curl -fsSL -o "$dest" "$url"; then
      ok "OK: $dest"
    else
      fail "Falha ao baixar: $url"
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -q -O "$dest" "$url"; then
      ok "OK: $dest"
    else
      fail "Falha ao baixar: $url"
    fi
  else
    fail "Instale curl ou wget"
  fi
}

echo ""
echo "============================================"
echo "  SUPERMOTOR — Inicializando ambiente"
echo "============================================"
echo ""

if ! command -v git >/dev/null 2>&1; then
  fail "Git não encontrado. Instale o Git e rode de novo."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  warn "Node.js não encontrado. O instalador continuará, mas o criador de projetos exige Node.js 20+."
fi

mkdir -p libs skills .cursor/rules .github templates bin tests projetos
chmod +x setup.sh supermotor.sh 2>/dev/null || true

info "Baixando bibliotecas (libs/)..."
echo ""
clone_if_missing "https://github.com/pbakaus/impeccable.git"      "libs/impeccable"
clone_if_missing "https://github.com/DietrichGebert/ponytail.git" "libs/ponytail"
clone_if_missing "https://github.com/fallow-rs/fallow.git"        "libs/fallow"
clone_if_missing "https://github.com/Graphify-Labs/graphify.git"  "libs/graphify"
clone_if_missing "https://github.com/open-gsd/gsd-core.git"       "libs/gsd-core"
clone_if_missing "https://github.com/affaan-m/ECC.git"            "libs/ecc"
clone_if_missing "https://github.com/mazzeoia/mazyos.git"         "libs/mazyos"

echo ""
info "Baixando skills de IA e design (skills/)..."
echo ""
clone_if_missing "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git" "skills/ui-ux-pro-max"
clone_if_missing "https://github.com/VoltAgent/awesome-design-md.git"          "skills/awesome-design-md"
download_if_missing \
  "https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md" \
  "skills/frontend-design.md"

echo ""
info "Gerando contexto Mazyos + regras de carrossel..."

CONTEXT_FILE="skills/mazyos-master-context.md"
cat > "$CONTEXT_FILE" <<'HEADER'
# CONTEXTO DA EMPRESA: MAZYOS

Você está desenvolvendo para a **Mazyos**.
Use o conteúdo abaixo (extraído do repositório oficial) para entender identidade, tom e propósito.

--- INÍCIO DO README DA EMPRESA ---
HEADER

if [ -f "libs/mazyos/README.md" ]; then
  cat "libs/mazyos/README.md" >> "$CONTEXT_FILE"
else
  echo "README da Mazyos não encontrado. Use tom profissional, moderno e focado em resultado." >> "$CONTEXT_FILE"
fi

cat >> "$CONTEXT_FILE" <<'FOOTER'

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
FOOTER

ok "Contexto gerado: $CONTEXT_FILE"

echo ""
info "Integrando skills com Cursor..."

[ -f "skills/frontend-design.md" ] && cp "skills/frontend-design.md" ".cursor/rules/frontend-design.md"

if [ -f "skills/ui-ux-pro-max/SKILL.md" ]; then
  cp "skills/ui-ux-pro-max/SKILL.md" ".cursor/rules/ui-ux-pro-max.md"
elif [ -f "skills/ui-ux-pro-max/README.md" ]; then
  cp "skills/ui-ux-pro-max/README.md" ".cursor/rules/ui-ux-pro-max.md"
fi

cp "$CONTEXT_FILE" ".cursor/rules/mazyos-master-context.md"
ok "Skills copiadas para .cursor/rules/"

echo ""
info "Criando regra global da IA..."

cat > ".cursor/rules/project-master.mdc" <<'EOF'
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

Se pedirem CRM, gestão de leads, funil comercial ou relacionamento com clientes, use `https://github.com/ArnasDon/wacrm` no ramo `main` como fundação. Preserve Next.js/Supabase, o remoto oficial como `upstream` e a licença MIT; não gere um CRM alternativo em outra stack.

## Comportamento

1. Prefira o que já existe em `libs/` e `skills/`.
2. Mantenha o tom e a identidade Mazyos.
3. Se faltar detalhe de marca (cores ou público), assuma um estilo profissional/moderno e pergunte somente o essencial.
4. Em projetos criados pelo motor, leia `PRODUCT.md`, `CONVERSATION.md`, `BRAND.md`, `DESIGN.md`, `SUPERPROMPT.md`, `QUALITY.md` e `.supermotor/AGENT_PROTOCOL.md` antes de implementar.
5. Confirme o favicon, elimine overflow horizontal e mantenha inputs com 16 px ou mais no mobile.
6. Nunca use `user-scalable=no` ou limite o pinch zoom; corrija a causa do problema de escala.
7. Registre início, etapas, testes, bloqueios e conclusão com `node .supermotor/agent.mjs` para alimentar o painel local.
EOF

cat > ".github/copilot-instructions.md" <<'EOF'
# Instruções globais — Supermotor / Mazyos

Em clone novo, leia `AUTOMATION.md` e execute o bootstrap automaticamente antes de trabalhar.
Use as bibliotecas em `libs/` (impeccable, ponytail, fallow, graphify, gsd-core, ecc e mazyos).
Para gráficos, use `libs/graphify`.

Siga as skills em `skills/`: frontend-design.md, ui-ux-pro-max, awesome-design-md e mazyos-master-context.md.

Para carrosséis: estrutura gancho → conteúdo → exemplo → CTA, mais as regras de swipe do contexto Mazyos.
Para CRM: use `https://github.com/ArnasDon/wacrm` no ramo `main`, preserve Next.js/Supabase, upstream e MIT.
Confirme o favicon e valide o mobile sem overflow ou autozoom de inputs. Preserve o pinch zoom acessível.
Em projetos SUPERMOTOR, leia `CONVERSATION.md` e registre o andamento com `node .supermotor/agent.mjs`.
Sempre prefira os padrões já baixados no projeto em vez de código genérico.
EOF

ok "Regras da IA configuradas"

mkdir -p "$ROOT/.supermotor-state"
printf '{\n  "version": "3.0.0",\n  "installedAt": "%s",\n  "platform": "unix",\n  "node": "%s"\n}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(node --version)" > "$ROOT/.supermotor-state/installed.json"
ok "Primeira execução registrada"

echo ""
echo "============================================"
echo -e "  ${GREEN}SUPERMOTOR pronto${NC}"
echo "============================================"
echo ""
echo "Pastas criadas/preenchidas:"
echo "  libs/     → impeccable, ponytail, fallow, graphify, gsd-core, ecc, mazyos"
echo "  skills/   → frontend-design, ui-ux-pro-max, awesome-design-md, contexto Mazyos"
echo "  .cursor/  → regras da IA (alwaysApply)"
echo "  .github/  → copilot-instructions.md"
echo ""
echo "Crie um projeto em um comando:"
echo "  ./supermotor.sh criar site \"Nome do site\""
echo "  ./supermotor.sh criar app \"Nome do app\""
echo "  ./supermotor.sh criar carrossel \"Nome do carrossel\""
echo "  ./supermotor.sh criar crm \"Nome do CRM\""
echo "  ./supermotor.sh painel"
echo "  ./supermotor.sh validar ./projetos/nome"
echo ""
echo "Ou abra o assistente guiado:"
echo "  ./supermotor.sh"
echo ""
echo "Se a IA esquecer em chats longos, diga:"
echo "  Revise as regras em .cursor/rules e skills/ e refaça."
echo ""
