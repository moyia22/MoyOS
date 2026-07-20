# Superprompt — aplicação para __PROJECT_NAME__

## Missão

Transforme este starter em uma aplicação completa para cumprir: **__PROJECT_BRIEF__**

## Antes de codificar

1. Leia `PRODUCT.md`, `DESIGN.md` e `QUALITY.md`.
2. Descreva os papéis de usuário e o fluxo crítico de cada papel.
3. Modele entidades, estados e permissões antes de criar telas adicionais.
4. Defina o menor fluxo vertical que entrega valor real de ponta a ponta.

## Arquitetura

- Rotas ficam finas; regras do produto vivem em `src/features`.
- Componentes compartilhados ficam em `src/shared`.
- Integrações e acesso a dados ficam em código server-only.
- Valide entradas e respostas com Zod.
- Não simule persistência como se fosse produção. Quando ainda não houver backend, sinalize dados de demonstração claramente.

## Experiência

- Preserve densidade, hierarquia e responsividade do dashboard inicial.
- Toda ação precisa de feedback: carregando, sucesso, erro ou desfazer.
- Inclua estados vazios úteis, permissões e mensagens de erro acionáveis.
- Priorize teclado, foco visível e navegação rápida.
- Gráficos devem responder a uma pergunta de negócio, nunca apenas decorar.

## Validação

Teste o fluxo principal no navegador, incluindo erro e estado vazio. Confirme favicon, ausência de overflow horizontal e campos sem autozoom. Depois rode `npm run check`, corrija todos os erros e confira `QUALITY.md` item por item.
