# SUPERMOTOR — __PROJECT_NAME__

Este projeto usa o **Frappe CRM oficial** como base, preservando seu backend Frappe e seu frontend Vue.

## Antes de alterar qualquer coisa

1. Leia `AGENTS.md`, que pertence ao projeto original.
2. Leia `.supermotor/PRODUCT.md`, `.supermotor/CONVERSATION.md`, `.supermotor/BRAND.md`, `.supermotor/SUPERPROMPT.md`, `.supermotor/QUALITY.md` e `.supermotor/AGENT_PROTOCOL.md`.
3. Consulte a documentação oficial do Frappe CRM antes de mudar instalação, dados, permissões ou integrações.
4. Não reescreva o CRM como uma aplicação Next.js genérica.
5. Registre início, etapas, testes, bloqueios e conclusão com `node .supermotor/agent.mjs` para alimentar o painel local.

## Origem

- Repositório usado: `__CRM_REPOSITORY__`
- Referência usada: `__CRM_REF__`
- Repositório oficial: `https://github.com/frappe/crm`
- Licença da base: AGPL-3.0

O remoto oficial é renomeado para `upstream`. Adicione o repositório do seu projeto como `origin` quando estiver pronto para publicá-lo.

## Desenvolvimento

O ambiente completo exige Frappe Bench. A aplicação deve ficar em `frappe-bench/apps/crm`, com um site Frappe que tenha o app `crm` instalado. Depois, use os comandos oficiais `bench start`, `yarn dev` em `frontend/` e acesse `/crm`.

Para produção padrão, siga o método oficial de Frappe Cloud ou a imagem `ghcr.io/frappe/crm`. Para uma versão personalizada, construa e publique sua própria imagem preservando as obrigações da licença.

## Proteções aplicadas pelo motor

- Viewport mobile sem bloqueio de pinch zoom.
- Campos mobile com pelo menos 16 px para evitar autozoom.
- Proteção contra overflow horizontal.
- Favicon próprio em `crm/public/`.
