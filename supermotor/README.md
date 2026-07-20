# SUPERMOTOR 3.0

O motor de criação do **MoyOS**. Um comando e nascem projetos completos, prontos pra produção, com a identidade da sua marca, protegidos pra mobile, rastreados por agentes de IA e conectados a todo o ecossistema MoyOS.

```powershell
.\supermotor.ps1 criar site "Meu Site"
.\supermotor.ps1 criar app "Meu Dashboard"
.\supermotor.ps1 criar crm "Meu CRM"
.\supermotor.ps1 criar carrossel "Meu Conteudo"
```

---

## Sumário

- [Quick start](#quick-start)
- [O que é o Supermotor](#o-que-é-o-supermotor)
- [Ecossistema](#ecossistema)
  - [Skills instaladas](#skills-instaladas)
  - [Bibliotecas embutidas](#bibliotecas-embutidas)
  - [Como skills e libs trabalham juntas](#como-skills-e-libs-trabalham-juntas)
- [Projetos](#projetos)
  - [Site premium](#site-premium)
  - [Aplicação](#aplicação)
  - [CRM com WhatsApp](#crm-com-whatsapp-wacrm)
  - [Estúdio de carrossel](#estúdio-de-carrossel)
- [CLI](#cli)
  - [Comandos](#comandos)
  - [Opções](#opções)
  - [Exemplos](#exemplos)
- [Assistente interativo](#assistente-interativo)
- [Control Room](#control-room)
  - [Agentes e atividades](#agentes-e-atividades)
  - [Projetos existentes](#projetos-existentes)
- [Brand Kit](#brand-kit)
- [Mobile](#mobile)
- [Qualidade](#qualidade)
- [Bootstrap](#bootstrap)
- [Templates](#templates)
- [Testes](#testes)
- [Compatibilidade](#compatibilidade)

---

## Quick start

Cole o link deste repositório no Codex, Cursor, Claude Code ou GitHub Copilot. O agente clona, prepara, diagnostica, inicia o painel e cria o projeto sem você precisar explicar nada.

**Ou faça manualmente:**

```powershell
.\bootstrap.ps1                    # Prepara tudo
.\supermotor.ps1 criar site "Nome" --rapido   # Projeto em segundos
.\supermotor.ps1 painel            # Acompanhe no navegador
```

Pronto. Seu projeto já existe com código, contexto pra IA, Brand Kit, proteções mobile e rastreamento de agentes.

---

## O que é o Supermotor

O Supermotor é a camada de criação do MoyOS. Ele não é só um gerador de templates — é um sistema que entrega **código, contexto, identidade e rastreamento** num único comando.

Cada projeto gerado já vem com:

- **Código funcional** — Next.js, TypeScript, Tailwind, pronto pra rodar.
- **Contexto pra IA** — PRODUCT.md, CONVERSATION.md, BRAND.md, DESIGN.md, QUALITY.md, SUPERPROMPT.md. O agente seguinte lê e continua de onde parou.
- **Regras pra agentes** — AGENTS.md, regras Cursor, instruções Copilot.
- **Rastreamento** — `.supermotor/agent.mjs` que alimenta o painel local.
- **Identidade visual** — favicon, cores, tipografia, tom de voz.
- **Proteções mobile** — viewport, overflow, inputs 16px, pinch zoom livre.

O resultado: você nunca mais começa um projeto do zero. E toda vez que um agente de IA trabalha nele, ele já sabe as regras, o design, a marca e o objetivo.

---

## Ecossistema

O Supermotor entrega dentro de cada projeto um ecossistema completo de design, arquitetura e contexto. Skills ensinam os agentes a projetar. Bibliotecas padronizam a implementação. O contexto mantém a identidade.

### Skills instaladas

Skills são instruções de alto nível que os agentes de IA carregam antes de trabalhar. Elas definem padrões de design, código e comportamento — o agente não precisa adivinhar, ele segue o que está documentado.

**UI/UX Pro Max**
67 estilos visuais — glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, skeuomorphism, flat design. 96 paletas de cor com acessibilidade. 57 font pairings testados. 25 tipos de gráfico. 13 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Cobre botões, modais, navbars, sidebars, cards, tabelas, formulários e charts. Inclui integração com shadcn/ui MCP pra consultar componentes reais.

**Frontend Design (Anthropic)**
Direção visual profissional — hierarquia tipográfica, sistemas de espaçamento, consistência de componentes, estados de loading/erro/vazio, responsividade, acessibilidade WCAG.

**Awesome Design MD**
Design engineering na prática — padrões que equilibram estética com performance, entregas rápidas sem débito técnico, decisões de implementação que o código sustenta.

**Mazyos Master Context**
A identidade e o tom do MoyOS. Tom ousado, humano e orientado a resultado. Estrutura de carrossel: gancho, conteúdo, exemplo, CTA. Regras de swipe, transição e comportamento esperado dos agentes dentro do ecossistema.

### Bibliotecas embutidas

Cada biblioteca em `libs/` é um módulo de conhecimento que os agentes consultam durante o desenvolvimento.

| Biblioteca | Função |
|------------|--------|
| **Impeccable** | Auditoria visual. Checklists de consistência, hierarquia, alinhamento, cor, tipografia, espaçamento. Toda tela parece do mesmo design system. |
| **Ponytail** | Simplificação de código. Padrões pra reduzir complexidade, eliminar código morto, enxugar componentes. Menos código, mais resultado. |
| **Fallow** | Análise de qualidade arquitetural. Métricas de acoplamento, coesão, complexidade. O que não serve cai. O que fica está justificado. |
| **Graphify** | Visualização de dados. Padrões pra gráficos, tabelas, dashboards, relatórios. Integração com Chart.js e Recharts. |
| **GSD Core** | Fluxo orientado a especificação. Metodologia: entender, especificar, implementar, testar, validar. Cada etapa com entregáveis definidos. |
| **ECC** | Padrões de engenharia. Convenções de código, design patterns, boas práticas de TypeScript, testes, segurança, performance. |
| **MazyOS** | Memória e identidade do MoyOS. Referência de tom de voz, personas, posicionamento, regras de comunicação. O cérebro do sistema. |

### Como skills e libs trabalham juntas

O fluxo é simples:

1. Você cria um projeto com `supermotor criar site "Nome"`.
2. O projeto nasce com código, contexto, Brand Kit e as skills linkadas.
3. Você ou um agente de IA abre o projeto.
4. O agente lê as skills aplicáveis (design, código, identidade).
5. O agente consulta as bibliotecas pra padrões específicos.
6. O agente implementa dentro dos padrões — sem adivinhar, sem inventar.

O resultado é consistente entre projetos, entre agentes, entre sessões. A mesma marca no site, no CRM e no carrossel. O mesmo padrão de código no dashboard de vendas e no sistema de estoque.

---

## Projetos

### Site premium

Landing page responsiva com direção visual editorial e narrativa de conversão.

**O que nasce pronto:**

- Next.js + TypeScript + Tailwind CSS
- Layout responsivo (mobile, tablet, desktop)
- Seções: hero, recursos, depoimentos, CTA, footer
- Design system com cores, tipografia e espaçamento
- Navegação com scroll suave
- Metadados (title, description, Open Graph)
- Favicon e proteções mobile
- Contexto completo de IA

```powershell
.\supermotor.ps1 criar site "Site da Empresa"
.\supermotor.ps1 criar site "Curso Online" --brief "Vender curso de marketing" --rapido
```

---

### Aplicação

Dashboard interativo com navegação, métricas e arquitetura preparada por features.

**O que nasce pronto:**

- Next.js + TypeScript + Tailwind CSS
- Layout com sidebar, header, área de conteúdo
- Páginas: dashboard, listagem, detalhe, configurações
- Gráficos integrados (Chart.js / Recharts)
- Tabela com busca, filtro e paginação
- Validação Zod em formulários
- Estados: loading, empty, error, success
- Arquitetura feature-first (escala melhor que pastas genéricas)
- Favicon, proteções mobile, Brand Kit
- Contexto completo de IA

```powershell
.\supermotor.ps1 criar app "Dashboard Vendas"
.\supermotor.ps1 criar app "SaaS Gestão" --brief "Relatórios de vendas em tempo real"
```

---

### CRM com WhatsApp (wacrm)

CRM completo integrado à API oficial do WhatsApp Business. Inbox compartilhado, pipeline Kanban, broadcasts, automações no-code e assistente de IA.

**O que o motor faz:**

1. Clona o repositório oficial do [wacrm](https://github.com/ArnasDon/wacrm) (ou seu fork)
2. Aplica Brand Kit, favicon e proteções mobile
3. Cria todo o contexto de IA específico pra CRM
4. Prepara `.env.local` com placeholders

**Stack do wacrm:**

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilo | Tailwind v4 |
| Banco | Supabase (Postgres + Auth + Storage + RLS) |
| WhatsApp | Meta Cloud API oficial |
| IA | OpenAI ou Anthropic (sua chave) |
| Licença | MIT |

**Funcionalidades nativas:**

- Inbox compartilhado com atribuição, status e notas
- Contatos com tags, campos customizados, importação CSV
- Pipeline Kanban com negócios vinculados a conversas
- Broadcasts com templates Meta, rastreamento de entrega
- Automações no-code com triggers e branches condicionais
- Assistente de IA com base de conhecimento própria
- Dashboard em tempo real
- Times com papéis (owner, admin, agent, viewer)
- API REST `/api/v1` com chaves escopadas
- Servidor MCP pra Claude, Cursor e outros

```powershell
.\supermotor.ps1 criar crm "CRM Comercial"
.\supermotor.ps1 criar crm "CRM Suporte" --crm-repo "https://github.com/seu-fork/wacrm"
```

---

### Estúdio de carrossel

Editor visual de carrosséis Instagram/LinkedIn com exportação PNG 1080x1350.

**O que nasce pronto:**

- 6 slides com narrativa completa
- Editor inline: chamada, título, texto, CTA
- Temas visuais seguindo o Brand Kit
- Pré-visualização em tempo real
- Exportação PNG individual
- Estrutura narrativa: gancho, problema, solução, prova, oferta, CTA

```powershell
.\supermotor.ps1 criar carrossel "Conteudo que vende"
.\supermotor.ps1 criar carrossel "Lancamento" --brief "Apresentar novo produto"
```

---

## CLI

### Comandos

| Comando | Aliases | Descrição |
|---------|---------|-----------|
| `criar` | `create`, `novo`, `new` | Cria site, app, carrossel ou crm |
| `painel` | `dashboard`, `monitor`, `acompanhar` | Abre a Control Room |
| `validar` | `validate`, `check` | Executa a régua de qualidade |
| `doctor` | `diagnostico`, `diagnóstico` | Diagnostica a saúde do motor |
| `registrar` | `register`, `track`, `adicionar-projeto` | Adiciona projeto ao painel |
| `atividade` | `activity`, `evento`, `event` | Registra atividade manual |
| `help` | `ajuda`, `--help`, `-h` | Mostra a ajuda |

### Opções

| Opção | Descrição |
|-------|-----------|
| `--brief "texto"` | Objetivo do projeto |
| `--sucesso "texto"` | Critério de sucesso |
| `--essenciais "texto"` | O que precisa funcionar primeiro |
| `--restricoes "texto"` | Limites e proibições |
| `--marca "nome"` | Nome da marca |
| `--publico "descrição"` | Público principal |
| `--tom "personalidade"` | Tom de voz |
| `--cor "#hex"` | Cor de destaque |
| `--favicon "caminho"` | Arquivo .ico, .png, .jpg, .svg |
| `--crm-repo "url"` | Fork do wacrm |
| `--crm-ref "ref"` | Branch/tag do wacrm |
| `--rapido` | Brand Kit automático |
| `--saida "caminho"` | Pasta de destino |
| `--sem-instalar` | Sem npm install |
| `--sem-build` | Validação estática |
| `--porta "n"` | Porta do painel (4545) |
| `--nao-abrir` | Painel sem navegador |

### Exemplos

```powershell
# Projeto completo com tudo especificado
.\supermotor.ps1 criar site "Meu Site" `
  --brief "Vender consultoria" `
  --sucesso "Formulários preenchidos, SEO na primeira página" `
  --essenciais "Hero, serviços, depoimentos, contato" `
  --restricoes "Sem frameworks pagos" `
  --marca "Minha Consultoria" `
  --publico "Empresários de médio porte" `
  --tom "profissional e acolhedor" `
  --cor "#1d4ed8" `
  --favicon "C:\Assets\logo.svg"

# CRM com fork personalizado e branch específica
.\supermotor.ps1 criar crm "CRM Pro" --crm-repo "https://github.com/user/wacrm" --crm-ref "develop"

# Validação
.\supermotor.ps1 validar ".\projetos\meu-site"
.\supermotor.ps1 validar ".\projetos\meu-app" --sem-build

# Painel
.\supermotor.ps1 painel
.\supermotor.ps1 painel --porta 4546 --nao-abrir

# Registrar atividade
.\supermotor.ps1 atividade ".\projetos\site" --agente "Codex" --status testing --acao "Validando formulário"
```

**Unix (Mac, Linux, Git Bash):**

```bash
./supermotor.sh criar site "Meu Site"
./supermotor.sh criar crm "CRM"
./supermotor.sh validar "./projetos/meu-site"
./supermotor.sh painel
```

---

## Assistente interativo

Sem argumentos, o Supermotor abre um assistente guiado:

```
SUPERMOTOR — novo projeto

1. Site premium
2. Aplicação / dashboard
3. Carrossel social editável
4. CRM completo com WhatsApp

Escolha o tipo [1-4]: _
```

Fluxo completo:

1. Tipo de projeto
2. Nome
3. Objetivo (opcional)
4. Critério de sucesso (opcional)
5. Funcionalidades essenciais (opcional)
6. Restrições (opcional)
7. Personalizar marca (opcional)
8. Favicon (opcional)

O assistente pergunta só o essencial pra criar. O resto da decisão vai pro SUPERPROMPT.md que a IA lê depois.

---

## Control Room

A Control Room é o hub visual de todos os seus projetos, agentes e atividades. 100% local em `http://127.0.0.1:4545`, sem dependências extras, sem dados na rede.

```powershell
.\supermotor.ps1 painel
```

**O que aparece:**

- Lista de projetos com tipo, nome, objetivo e progresso
- Agentes com status visual: planejando, trabalhando, testando, revisando, bloqueado, concluído, pausado
- Timeline de atividades registradas
- Arquivos modificados recentemente
- Contexto completo (objetivo, sucesso, essenciais, restrições)
- Prompt pra continuar a conversa com IA
- Formulário de atividade manual

### Agentes e atividades

Cada projeto inclui `.supermotor/agent.mjs` que os agentes usam pra registrar trabalho:

```bash
node .supermotor/agent.mjs start --agent "Codex" --action "Implementando autenticação"
node .supermotor/agent.mjs test --agent "QA" --action "Validando fluxo de login"
node .supermotor/agent.mjs done --agent "Codex" --action "Autenticação completa"
node .supermotor/agent.mjs block --agent "Codex" --action "API externa sem resposta"
```

Pelo motor:

```powershell
.\supermotor.ps1 atividade ".\projetos\meu-site" --agente "Codex" --status testing --acao "Validando checkout"
```

### Projetos existentes

```powershell
.\supermotor.ps1 registrar "C:\Projetos\meu-projeto"
```

O motor detecta automaticamente se é CRM (pela estrutura) ou classifica como projeto genérico.

```powershell
.\supermotor.ps1 painel status
.\supermotor.ps1 painel parar
.\supermotor.ps1 painel iniciar
```

---

## Brand Kit

Todo projeto recebe um Brand Kit completo. O motor calcula automaticamente:

- **Monograma** — iniciais da marca em SVG como favicon
- **Cor suave** — versão com branco pra backgrounds
- **Cor de texto** — preto ou branco por contraste

Resultado: `BRAND.md` em cada projeto com marca, público, tom, cor e favicon documentados. A IA lê antes de criar qualquer peça visual.

---

## Mobile

Proteções aplicadas em todo projeto:

| Problema | Solução |
|----------|---------|
| Zoom bloqueado | Reprova `user-scalable=no` e escala abaixo de 2 |
| Overflow horizontal | `overflow-x: clip` |
| Input que zooma no iOS | `font-size: 16px !important` no mobile |
| Escala de texto quebrada | `-webkit-text-size-adjust: 100%` |
| Delay em controles | `touch-action: manipulation` |
| Viewport incorreta | `width=device-width, initial-scale=1, viewport-fit=cover` |

A validação checa cada item e reprova se faltar.

---

## Qualidade

```powershell
.\supermotor.ps1 validar ".\projetos\meu-site"
```

A validação verifica:

**1. Arquivos obrigatórios**
package.json, PRODUCT.md, CONVERSATION.md, BRAND.md, DESIGN.md, QUALITY.md, SUPERPROMPT.md, AGENTS.md, `.supermotor/project.json`, `.supermotor/agent.mjs`, `.supermotor/AGENT_PROTOCOL.md`

**2. Favicon**
Site/App: `src/app/icon.*` ou `favicon.ico`
CRM: `public/supermotor-icon.*`

**3. Proteções mobile**
Viewport, zoom, overflow, inputs 16px, touch-action, text-size-adjust

**4. Tokens substituídos**
Nenhum `__PROJECT_*__`, `__BRAND_*__`, `__FAVICON_*__` ou `__CRM_*__` pode sobrar

**5. Build**
`npm run check` (typecheck + lint + build)

---

## Bootstrap

### Automático (agentes)

O agente que recebe o link do repositório segue `AUTOMATION.md`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

```bash
bash ./bootstrap.sh
```

O bootstrap: confirma Node.js/Git, executa setup, instala libs e skills, roda diagnóstico, inicia Control Room, abre o navegador.

### Manual

```powershell
.\setup.ps1
```

Instala regras Cursor, instruções Copilot, skills da comunidade (UI/UX Pro Max, Awesome Design MD, Frontend Design), configura contexto Mazyos.

---

## Templates

```
templates/
  common/         Base compartilhada entre todos os tipos
  site/           Landing page premium
  application/    Dashboard e sistemas web
  carousel/       Estúdio de carrossel social
  crm/            Contexto aplicado sobre o wacrm
  tracking/       Rastreamento e protocolo de agentes
```

**Fluxo de criação:**

- **Site, App, Carrossel**: copia `common/` + template específico
- **CRM**: clona repositório oficial do wacrm e aplica overlay `crm/`
- **Tracking**: copiado pra `.supermotor/` no projeto

Tokens `__PROJECT_*__`, `__BRAND_*__`, `__FAVICON_*__`, `__CRM_*__` substituídos durante a criação.

---

## Testes

```bash
npm test
```

Cria todos os quatro tipos de projeto em área temporária isolada. Verifica:

- Arquivos obrigatórios
- Tokens substituídos
- Proteções mobile
- Favicon
- Validação estática
- Agentes registram atividades
- Painel funciona em porta isolada
- CRM com repositório simulado

```bash
npm run doctor
```

Verifica Node.js, npm, Git, templates, bibliotecas, skills.

---

## Compatibilidade

| Componente | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| CLI (Node.js) | Sim | Sim | Sim |
| Wrapper PowerShell | Sim 5.1+ | - | - |
| Wrapper Bash | - | Sim | Sim |
| Bootstrap | Sim | Sim | Sim |
| Dashboard | Sim | Sim | Sim |
| CRM wacrm | Sim | Sim | Sim |
| Testes | Sim | Sim | Sim |

Requisitos: Node.js 20+, Git. Para CRM: conta Supabase gratuita e credenciais Meta WhatsApp Business API.

---

**MoyOS** — o sistema operacional do seu negócio dentro do Claude Code.
