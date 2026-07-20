# Desenvolvimento do SUPERMOTOR

## Clone novo ou link enviado pelo usuário

Leia `AUTOMATION.md`. Se o usuário forneceu somente o link deste repositório, clone, entre na pasta e execute o bootstrap apropriado ao sistema operacional. Faça a preparação, o diagnóstico e a inicialização da Control Room diretamente; não transfira essas etapas para o usuário.

Este repositório é um gerador. Mudanças precisam preservar dois níveis:

1. O motor (`bin/`, wrappers e setup).
2. Os projetos gerados (`templates/`).

## Regras

- Todo arquivo local deve funcionar em Windows e em ambientes Unix quando aplicável.
- O CLI não deve exigir dependências npm próprias.
- O painel local deve escutar somente em `127.0.0.1`, permanecer sem dependências npm e não expor segredos ou arquivos completos pela API.
- Projetos gerados devem incluir `.supermotor/agent.mjs`, o protocolo de atividade e contexto conversacional para alimentar o painel.
- Templates precisam permanecer autocontidos e usar tokens `__PROJECT_*__`, `__BRAND_*__` e `__FAVICON_*__` somente onde o CLI os substitui.
- Brand Kit e favicon precisam existir em todo projeto gerado.
- Todo pedido de CRM deve partir de `https://github.com/ArnasDon/wacrm`, usando `main` como base estável; não gere um CRM alternativo em outra stack.
- Preserve a arquitetura Next.js/Supabase, o remoto oficial como `upstream` e a licença MIT nos projetos CRM.
- Mobile não pode ter overflow horizontal ou inputs abaixo de 16 px; pinch zoom deve permanecer acessível.
- Não declare um starter pronto sem rodar `npm test`.
- Alterações de dependências ou código de template exigem pelo menos typecheck, lint e build do tipo afetado.
- Preserve UTF-8 e a compatibilidade do `setup.ps1` com Windows PowerShell 5.1.
