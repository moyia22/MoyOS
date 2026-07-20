# Protocolo de acompanhamento dos agentes

O painel local lê `.supermotor/activity.jsonl` e `.supermotor/agents.json` em tempo real.

Todo agente que trabalhar neste projeto deve registrar:

1. Início da tarefa.
2. Mudanças de etapa relevantes.
3. Testes e revisões.
4. Bloqueios com o motivo.
5. Conclusão com o resultado concreto.

Exemplos:

```bash
node .supermotor/agent.mjs start --agent "Codex" --action "Mapeando o fluxo de login"
node .supermotor/agent.mjs update --agent "Codex" --action "Backend pronto" --detail "Iniciando interface"
node .supermotor/agent.mjs test --agent "QA" --action "Testando login e recuperação de senha"
node .supermotor/agent.mjs blocked --agent "Codex" --action "Aguardando chave da API"
node .supermotor/agent.mjs done --agent "Codex" --action "Login entregue e validado"
```

Não registre tokens, senhas, dados pessoais ou conteúdo confidencial nos detalhes.

