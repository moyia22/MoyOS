# SUPERMOTOR 3.0

O motor Mazyos para criar **sites premium, aplicações, CRMs e carrosséis de alto nível**, conversar melhor com a IA e acompanhar agentes em uma central local.

Ele combina starters funcionais, briefing inteligente, direção visual, regras para IA, rastreamento de atividades e validação técnica. O projeto já nasce preparado para continuar no Cursor, Codex, Claude Code ou GitHub Copilot.

## Basta colar o link do repositório

Envie somente o link deste repositório para Codex, Cursor, Claude Code ou outro agente com acesso ao terminal. Depois de clonar, o agente encontra `AGENTS.md`, `AUTOMATION.md`, `CLAUDE.md`, regras do Cursor e instruções do Copilot.

O comportamento esperado é automático:

1. Clonar e entrar no repositório.
2. Executar `bootstrap.ps1` no Windows ou `bootstrap.sh` em Unix.
3. Preparar bibliotecas e regras.
4. Rodar o diagnóstico.
5. Iniciar a Control Room em segundo plano.
6. Abrir o painel local.
7. Criar o projeto já descrito, sem repetir perguntas respondidas.

Você não precisa explicar os comandos junto com o link. O contrato em `AUTOMATION.md` determina que o agente execute essas etapas diretamente.

Se quiser fazer a mesma automação manualmente:

```powershell
.\bootstrap.ps1
```

## Começo mais fácil

No Windows, abra o PowerShell nesta pasta e execute:

```powershell
.\setup.ps1
.\supermotor.ps1
```

O assistente começa com três perguntas essenciais:

1. O que você quer criar?
2. Qual é o nome?
3. Qual é o objetivo?

Em seguida, esclarece como medir sucesso, o que precisa funcionar primeiro e quais limites ou integrações devem ser respeitados. Também oferece um Brand Kit rápido e sempre pergunta pelo favicon. Pressionando Enter, o motor usa padrões seguros e gera um monograma automaticamente.

## Criar diretamente

### Windows

```powershell
.\supermotor.ps1 criar site "Site da Mazyos"
.\supermotor.ps1 criar app "Painel Comercial"
.\supermotor.ps1 criar carrossel "Conteúdo que vende"
.\supermotor.ps1 criar crm "CRM Comercial"
```

### Mac, Linux ou Git Bash

```bash
./supermotor.sh criar site "Site da Mazyos"
./supermotor.sh criar app "Painel Comercial"
./supermotor.sh criar carrossel "Conteúdo que vende"
./supermotor.sh criar crm "CRM Comercial"
```

Os projetos são criados em `projetos/`.

Para usar marca e favicon automáticos sem perguntas adicionais:

```powershell
.\supermotor.ps1 criar site "Nome" --rapido
```

## Painel local de projetos e agentes

Execute:

```powershell
.\supermotor.ps1 painel
```

O navegador abre a **SUPERMOTOR Control Room** em `http://127.0.0.1:4545`. O painel funciona somente neste computador e não exige instalação adicional.

Ele mostra:

- Projetos criados pelo motor.
- Agentes trabalhando, testando, revisando, bloqueados ou concluídos.
- Linha do tempo das atividades.
- Arquivos modificados recentemente, mesmo sem registro manual do agente.
- Objetivo, sucesso esperado, funcionalidades essenciais e restrições.
- Prompt pronto para continuar a conversa com a IA sem perder contexto.
- Formulário para registrar uma atualização manual.

Cada projeto inclui `.supermotor/agent.mjs`. Os agentes recebem instruções para registrar seu andamento automaticamente:

```bash
node .supermotor/agent.mjs start --agent "Codex" --action "Implementando autenticação"
node .supermotor/agent.mjs test --agent "QA" --action "Validando o fluxo principal"
node .supermotor/agent.mjs done --agent "Codex" --action "Entrega concluída"
```

O histórico operacional e o estado dos agentes são locais e ficam fora do Git.

O bootstrap inicia o painel em segundo plano. Para consultar ou encerrar:

```powershell
.\supermotor.ps1 painel status
.\supermotor.ps1 painel parar
.\supermotor.ps1 painel iniciar
```

Para acompanhar um projeto que já existia antes do SUPERMOTOR:

```powershell
.\supermotor.ps1 registrar "C:\Projetos\meu-projeto"
.\supermotor.ps1 painel
```

## O que nasce pronto

### Site premium

- Landing page responsiva com direção visual editorial.
- Narrativa de conversão, seções, CTAs e design system inicial.
- Metadados, TypeScript estrito, Tailwind CSS e Next.js.
- Favicon fornecido ou monograma gerado automaticamente.
- Proteção contra overflow e autozoom de campos no celular.
- Superprompt específico para transformar o starter no site real.

### Aplicação

- Dashboard responsivo e interativo.
- Navegação, métricas, gráfico, tarefas e atividades.
- Arquitetura preparada por features, validação com Zod e estados de produto.
- Superprompt para modelar usuários, dados, permissões e fluxo crítico.

### Estúdio de carrossel

- Seis slides com narrativa completa.
- Editor de chamada, título, texto, CTA e tema visual.
- Navegação, adição e remoção de slides.
- Exportação de cada slide como PNG em **1080 × 1350 px**.
- Superprompt com gancho, progressão, prova e CTA.

### CRM com Frappe

- Clona automaticamente a base oficial [`frappe/crm`](https://github.com/frappe/crm) no ramo `main` estável.
- Mantém o repositório oficial como remoto `upstream` para facilitar atualizações.
- Preserva o backend Frappe, o frontend Vue e a licença AGPL-3.0.
- Parte dos recursos nativos de leads, negócios, contatos, organizações, atividades e Kanban.
- Aplica Brand Kit, favicon e proteções mobile do SUPERMOTOR.
- Cria contexto próprio em `.supermotor/` e orientações para Frappe Bench.

## Continuar com IA

Entre no projeto criado, rode `npm run dev` e peça:

> Leia `SUPERPROMPT.md`, `PRODUCT.md`, `CONVERSATION.md`, `BRAND.md`, `DESIGN.md`, `QUALITY.md` e `.supermotor/AGENT_PROTOCOL.md`. Registre seu andamento, execute o projeto até cumprir os critérios e valide o resultado no navegador.

Cada starter também inclui:

- `AGENTS.md` para Codex e agentes compatíveis.
- `.cursor/rules/supermotor.mdc` para Cursor.
- `.github/copilot-instructions.md` para GitHub Copilot.
- `PRODUCT.md` com objetivo e escopo.
- `CONVERSATION.md` com sucesso esperado, funcionalidades essenciais, limites e regras de comunicação.
- `BRAND.md` com marca, público, personalidade, cor e origem do favicon.
- `DESIGN.md` com direção visual e anti-padrões.
- `QUALITY.md` com critérios objetivos de conclusão.
- `.supermotor/agent.mjs` e `AGENT_PROTOCOL.md` para alimentar o painel local.

## Comandos úteis

```powershell
# Verificar se o motor está saudável
.\supermotor.ps1 doctor

# Abrir o painel local de projetos e agentes
.\supermotor.ps1 painel

# Iniciar sem abrir o navegador ou escolher outra porta
.\supermotor.ps1 painel --nao-abrir --porta 4546

# Adicionar um projeto existente ao painel
.\supermotor.ps1 registrar "C:\Projetos\meu-projeto"

# Criar sem instalar dependências
.\supermotor.ps1 criar site "Nome" --sem-instalar

# Escolher a pasta exata de saída
.\supermotor.ps1 criar app "Nome" --saida "C:\Projetos\nome"

# Informar o objetivo no próprio comando
.\supermotor.ps1 criar carrossel "Nome" --brief "Ensinar empresários a estruturar ofertas"

# Informar Brand Kit e favicon
.\supermotor.ps1 criar site "Nome" --marca "Minha Marca" --publico "Empresários" --tom "direta e premium" --cor "#0f766e" --favicon ".\logo.svg"

# Criar um CRM usando a base oficial estável
.\supermotor.ps1 criar crm "CRM Comercial" --brief "Organizar leads, propostas e follow-ups"

# Registrar uma atividade pelo motor
.\supermotor.ps1 atividade ".\projetos\nome" --agente "Codex" --status testing --acao "Validando o checkout"

# Validar favicon, mobile, TypeScript, lint e build
.\supermotor.ps1 validar ".\projetos\nome"
```

## Régua de qualidade

Para executar a régua completa pelo motor:

```powershell
.\supermotor.ps1 validar ".\projetos\nome"
```

Dentro do próprio projeto também é possível executar:

```bash
npm run check
```

O comando `validar` exige favicon, Brand Kit, viewport correta, zoom acessível, proteção contra overflow, inputs mobile seguros e tokens substituídos. Nos starters Next.js, executa TypeScript, lint e build. No CRM, reconhece a estrutura Frappe e, dentro de um ambiente Bench preparado, executa testes e build do frontend Vue.

## Mobile sem zoom bugado

Os starters usam `width=device-width` e escala inicial 1, impedem overflow horizontal e mantêm inputs com pelo menos 16 px no celular para evitar o autozoom ao receber foco.

O gesto de pinch zoom continua disponível por acessibilidade. O motor reprova `user-scalable=no` e limites de escala abaixo de 2.

## O que o setup instala

### Bibliotecas em `libs/`

- Impeccable — direção e auditoria visual.
- Ponytail — simplificação e eficiência de código.
- Fallow — análise de qualidade e arquitetura.
- Graphify — conhecimento e visualização do projeto.
- GSD Core — fluxo orientado a especificação.
- ECC — padrões para agentes e engenharia.
- MazyOS — identidade, memória e referência da Mazyos.

### Skills em `skills/`

- Frontend Design da Anthropic.
- UI/UX Pro Max.
- Awesome Design MD.
- Contexto Mazyos + regras de carrossel.

## Requisitos

- Node.js 20 ou superior.
- Git.
- PowerShell no Windows ou Bash no Mac/Linux.

Para desenvolver o CRM completo também são necessários Frappe Bench e seus requisitos. A alternativa oficial para implantação usa Frappe Cloud ou Docker.

## Desenvolvimento do motor

```bash
npm test
npm run doctor
```

Os testes criam os quatro tipos de projeto em uma área temporária, incluindo um repositório Frappe CRM simulado. Também iniciam o painel em uma porta isolada e verificam página, API local, segurança, projetos, agentes, arquivos recentes e atualização de atividades.
