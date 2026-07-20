# MoyOS

> O sistema operacional do seu negócio dentro do Claude Code.

MoyOS transforma o Claude Code no sistema operacional da sua empresa. Não é uma ferramenta que você usa — é o ambiente onde seu negócio roda. Cada processo crítico vira um loop fechado: decide, executa, captura, realimenta, ajusta sozinho.

---

## O ecossistema

### SUPERMOTOR — motor de criação

Coração do MoyOS. Um comando e nascem projetos completos com código funcional, identidade visual, proteções mobile, contexto pra IA e rastreamento de agentes.

```powershell
.\supermotor.ps1 criar site "Meu Site"       # Landing page premium
.\supermotor.ps1 criar app "Meu Dashboard"     # Aplicação completa
.\supermotor.ps1 criar crm "Meu CRM"           # CRM com WhatsApp integrado
.\supermotor.ps1 criar carrossel "Conteudo"    # Estúdio de carrossel social
.\supermotor.ps1 painel                        # Control Room — acompanhe tudo
.\supermotor.ps1 validar ".\projetos\meu-site" # Régua de qualidade
```

### Skills instaladas

Cada skill ensina os agentes de IA a projetar e codificar dentro dos padrões do MoyOS:

| Skill | Função |
|-------|--------|
| **UI/UX Pro Max** | 67 estilos, 96 paletas, 57 font pairings, 25 gráficos, 13 stacks |
| **Frontend Design** | Direção visual profissional — hierarquia, espaçamento, componentes, acessibilidade |
| **Awesome Design MD** | Design engineering — estética com performance, entregas sem débito técnico |
| **Mazyos Master Context** | Identidade, tom e regras do MoyOS — gancho, conteúdo, exemplo, CTA |

### Bibliotecas em `libs/`

| Biblioteca | Função |
|------------|--------|
| **Impeccable** | Auditoria visual. Consistência em cada tela. |
| **Ponytail** | Simplificação de código. Menos complexidade, mais resultado. |
| **Fallow** | Análise de qualidade arquitetural. |
| **Graphify** | Visualização de dados e dashboards. |
| **GSD Core** | Fluxo do briefing ao deploy. |
| **ECC** | Padrões de engenharia e boas práticas. |
| **MazyOS** | Memória, identidade e referência da marca. |

### Projetos

**Site premium** — Next.js + TypeScript + Tailwind. Landing page responsiva com design system, metadados, favicon e SEO.

**Aplicação** — Dashboard interativo com navegação, métricas, formulários com Zod, estados de loading/erro/vazio. Arquitetura feature-first.

**CRM com WhatsApp** (wacrm) — CRM completo integrado à API oficial do WhatsApp Business. Inbox compartilhado, pipeline Kanban, contatos, broadcasts, automações no-code, assistente de IA com base de conhecimento própria, times com papéis, API REST e servidor MCP. Baseado em Next.js + Supabase + Tailwind.

**Estúdio de carrossel** — 6 slides editáveis com exportação PNG 1080×1350. Narrativa: gancho, problema, solução, prova, oferta, CTA.

### Control Room

Painel local em `http://127.0.0.1:4545` para acompanhar projetos, agentes e atividades em tempo real. Cada projeto inclui `.supermotor/agent.mjs` pra agentes registrarem andamento automaticamente.

---

## Comandos do dia a dia

```
/abrir               Carrega o contexto antes de cada sessão
/salvar              Commit + push no GitHub
/atualizar           Varre o projeto e atualiza a memória
/novo-projeto        Cria pasta isolada pra cada cliente
/mapear-rotinas      Descobre o que você repete e vira skill
/carrossel           Cria carrosséis 1080×1350 com a identidade da marca
/publicar-tema       Artigo de blog + carrossel + 3 legendas
/seo                 Fluxo completo de SEO (8 passos)
/responder-avaliacoes Respostas humanas pra reviews do Google
/aprovar-post        Publica blog + Instagram + Facebook num comando
/anuncio-google      Monta campanha em CSV pro Google Ads Editor
/relatorio-ads       Relatório semanal de Google + Meta Ads
/analisar-dados      Resume CSV, XLSX ou PDF em relatório executivo
/email-profissional  Rascunha email a partir de contexto livre
```

---

## Como o MoyOS pensa

`_memoria/` é o cérebro. Tudo que importa do seu negócio mora aqui — quem é a empresa, como ela fala, o que tá em foco. O Claude lê isso antes de cada resposta.

`identidade/` é o rosto. Cores, fontes, logo, padrão visual. Toda peça que o sistema gera respeita isso.

`marketing/`, `saidas/` e `scripts/` são o resultado. O sistema produz, versiona no GitHub, fica tudo seu.

---

## Começar

Cole no Claude Code:

```
Clona o https://github.com/moyia22/MoyOS.git na pasta atual,
entra nela e roda o /instalar.
```

Ou manualmente:

```bash
git clone https://github.com/moyia22/MoyOS.git
cd MoyOS
code .
```

Depois: terminal integrado → `claude` → `/instalar`.

Quando o `/instalar` terminar, renomeie a pasta `MoyOS/` pro nome do seu negócio. A pasta não fica como "MoyOS" — ela é o seu negócio agora.
