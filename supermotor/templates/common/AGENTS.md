# SUPERMOTOR — instruções do projeto

Antes de alterar o projeto, leia nesta ordem:

1. `PRODUCT.md`
2. `CONVERSATION.md`
3. `BRAND.md`
4. `DESIGN.md`
5. `SUPERPROMPT.md`
6. `QUALITY.md`
7. `.supermotor/AGENT_PROTOCOL.md`

## Fluxo obrigatório

1. Registre o início com `node .supermotor/agent.mjs start --agent "Nome" --action "Tarefa"`.
2. Entenda o objetivo e preserve o que já funciona.
3. Defina arquitetura da informação e direção visual antes de expandir componentes.
4. Registre mudanças de etapa com `update`, `test` ou `review`.
5. Implemente o fluxo principal completo.
6. Valide comportamento, responsividade e acessibilidade no navegador.
7. Rode `npm run check`.
8. Corrija problemas e registre `done`; se houver impedimento real, registre `blocked` com o motivo.

## Padrão de trabalho

- Use TypeScript estrito e componentes pequenos com responsabilidade clara.
- Prefira Server Components; use `"use client"` apenas quando houver interação real.
- Não invente APIs, resultados, depoimentos ou dados de clientes.
- Não substitua uma experiência funcional por uma maquete estática.
- Não entregue botões sem ação, telas quebradas ou conteúdo de placeholder.
- Não bloqueie pinch zoom. Evite autozoom mantendo inputs com 16 px ou mais no mobile.
- Não conclua com overflow horizontal, conteúdo cortado ou favicon ausente.
- Mantenha a identidade definida em `DESIGN.md` e documente decisões relevantes.
