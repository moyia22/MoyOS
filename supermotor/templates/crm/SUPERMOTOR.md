# SUPERMOTOR — __PROJECT_NAME__

Este projeto usa o **wacrm** como base — CRM open source com Next.js, Supabase e integração nativa à API do WhatsApp Business.

## Antes de alterar qualquer coisa

1. Leia `AGENTS.md`, que pertence ao projeto original.
2. Leia `.supermotor/PRODUCT.md`, `.supermotor/CONVERSATION.md`, `.supermotor/BRAND.md`, `.supermotor/SUPERPROMPT.md`, `.supermotor/QUALITY.md` e `.supermotor/AGENT_PROTOCOL.md`.
3. Consulte a documentação oficial em https://wacrm.tech/docs antes de mudar instalação, dados, permissões ou integrações.
4. Não substitua o backend Next.js/Supabase por uma aplicação genérica.
5. Registre início, etapas, testes, bloqueios e conclusão com `node .supermotor/agent.mjs` para alimentar o painel local.

## Origem

- Repositório usado: `__CRM_REPOSITORY__`
- Referência usada: `__CRM_REF__`
- Repositório oficial: `https://github.com/ArnasDon/wacrm`
- Licença da base: MIT

## Desenvolvimento

O ambiente exige Node.js 20+, uma conta Supabase gratuita e credenciais da Meta WhatsApp Business API.

1. Crie um projeto em https://supabase.com e copie as credenciais.
2. Rode as migrações: `supabase migration up` ou execute os SQL em `supabase/migrations/`.
3. Configure o Meta WhatsApp Business API seguindo https://wacrm.tech/docs/whatsapp-setup.
4. Preencha `.env.local` com as credenciais.
5. Rode `npm install && npm run dev`.

## Proteções aplicadas pelo motor

- Campos mobile com pelo menos 16 px para evitar autozoom.
- Proteção contra overflow horizontal.
- CSS injetado em `src/app/globals.css` com guards mobile.
- Favicon próprio em `public/`.
