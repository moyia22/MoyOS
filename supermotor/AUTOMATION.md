# Contrato de automação do SUPERMOTOR

Este arquivo existe para agentes de IA que receberam apenas o link deste repositório.

## Comportamento obrigatório após clonar

Não devolva ao usuário uma lista de comandos para ele executar. Faça a preparação diretamente:

### Windows

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

### macOS, Linux ou Git Bash

```bash
bash ./bootstrap.sh
```

O bootstrap confirma Node.js e Git, executa o setup, roda o diagnóstico, inicia a Control Room em segundo plano e abre `http://127.0.0.1:4545` quando houver navegador.

## Depois da preparação

- Se o usuário já descreveu um projeto, crie o tipo correspondente sem repetir perguntas respondidas.
- Se pediu CRM, use `frappe/crm` conforme `AGENTS.md`.
- Se ainda não descreveu o projeto, deixe a Control Room pronta e faça no máximo a pergunta essencial que falta.
- Registre projetos e atividades para que apareçam no painel.
- Nunca registre senhas, tokens ou dados pessoais no histórico.

## Controle do painel

```powershell
.\supermotor.ps1 painel status
.\supermotor.ps1 painel parar
.\supermotor.ps1 painel iniciar
```

