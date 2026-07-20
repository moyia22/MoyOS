#!/usr/bin/env node

import { parseArgs } from "./lib/ui.mjs";
import { ui } from "./lib/ui.mjs";
import { createProject } from "./lib/project.mjs";
import { validateProject } from "./lib/project.mjs";
import { runOnboarding } from "./lib/onboarding.mjs";
import { doctor } from "./lib/commands.mjs";
import { recordActivity } from "./lib/commands.mjs";
import { registerExistingProject } from "./lib/commands.mjs";
import { listProjectsCommand } from "./lib/commands.mjs";
import { removeProjectCommand } from "./lib/commands.mjs";
import { atividadesCommand } from "./lib/commands.mjs";
import { agentesCommand } from "./lib/commands.mjs";
import { statusCommand } from "./lib/commands.mjs";
import { startDashboardDaemon } from "./lib/commands.mjs";
import { stopDashboardDaemon } from "./lib/commands.mjs";
import { dashboardDaemonStatus } from "./lib/commands.mjs";

function help() {
  console.log(`
SUPERMOTOR 3.0

Uso:
  supermotor onboarding
  supermotor criar site "Nome do projeto"
  supermotor criar app "Nome do projeto"
  supermotor criar carrossel "Nome do projeto"
  supermotor criar crm "Nome do CRM"
  supermotor painel
  supermotor painel iniciar|parar|status
  supermotor listar [--verbose] [--json]
  supermotor remover <caminho> [--deletar] [--forcar] [--dry-run]
  supermotor registrar [caminho]
  supermotor atividade [projeto] --agente "Nome" --status working --acao "O que esta fazendo"
  supermotor atividades [projeto] [--limite 10]
  supermotor agentes [projeto]
  supermotor status [projeto]
  supermotor validar [caminho]
  supermotor doctor

Comandos:
  onboarding    Assistente interativo que conhece voce e seu negocio,
                depois sugere e cria o projeto ideal
  criar         Cria um novo projeto a partir de um template
  validar       Verifica se um projeto atende aos padroes do SUPERMOTOR
  painel        Inicia o painel local de acompanhamento
  listar        Mostra todos os projetos registrados
  remover       Remove o registro de um projeto (ou deleta os arquivos)
  registrar     Registra um projeto existente para acompanhamento
  atividade     Registra uma atividade em um projeto
  atividades    Mostra atividades recentes de um projeto
  agentes       Mostra agentes trabalhando em um projeto
  status        Mostra resumo do status de um projeto
  doctor        Diagnostico do ambiente e dependencias

Opcoes:
  --verbose     Mostra detalhes ao listar projetos (atividades, agentes, datas)
  --json        Saida em formato JSON (para listar)
  --forcar      Pula confirmacao ao remover
  --dry-run     Mostra o que seria removido sem executar
  --limite N    Numero de atividades a mostrar (padrao: 10)
  --brief "objetivo"       Define o objetivo do projeto
  --sucesso "resultado"    Define como medir o sucesso
  --essenciais "itens"     Define o que precisa funcionar primeiro
  --restricoes "limites"   Define integracoes, limites e proibicoes
  --marca "nome"           Define o nome da marca
  --publico "descricao"    Define o publico principal
  --tom "personalidade"    Define a personalidade da marca
  --cor "#ff5a1f"          Define a cor de destaque
  --favicon caminho        Usa um favicon .ico, .png, .jpg ou .svg
  --crm-repo caminho/url   Usa um fork ou espelho do wacrm
  --crm-ref referencia     Define branch/tag do CRM (padrao: main estavel)
  --rapido                  Usa Brand Kit e favicon automaticos
  --saida caminho          Define a pasta exata de destino
  --sem-instalar           Cria os arquivos sem executar npm install
  --sem-build              Faz somente validacao estatica
  --porta 4545             Define a porta do painel local
  --nao-abrir              Inicia o painel sem abrir o navegador

Sem argumentos, o criador abre o assistente guiado.
`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.positionals[0]?.toLowerCase();

  if (parsed.options.help || ["help", "ajuda", "--help", "-h"].includes(command)) {
    help();
    return;
  }

  if (!command) {
    parsed.positionals = ["criar"];
    await createProject(parsed);
    return;
  }

  if (["doctor", "diagnostico", "diagnóstico"].includes(command)) {
    doctor();
    return;
  }

  if (["validate", "validar", "check"].includes(command)) {
    validateProject(parsed);
    return;
  }

  if (["painel", "dashboard", "monitor", "acompanhar"].includes(command)) {
    const action = parsed.positionals[1]?.toLowerCase();
    if (["iniciar", "start", "background", "segundo-plano"].includes(action)) {
      await startDashboardDaemon(parsed);
      return;
    }
    if (["parar", "stop", "encerrar"].includes(action)) {
      stopDashboardDaemon();
      return;
    }
    if (["status", "estado"].includes(action)) {
      dashboardDaemonStatus();
      return;
    }
    const { startDashboard } = await import("./dashboard-server.mjs");
    await startDashboard({
      port: Number(parsed.options.porta || parsed.options.port || 4545),
      open: !Boolean(parsed.options["nao-abrir"] || parsed.options["não-abrir"] || parsed.options["no-open"]),
    });
    return;
  }

  if (["atividade", "activity", "evento", "event"].includes(command)) {
    recordActivity(parsed);
    return;
  }

  if (["atividades", "activities", "historico", "history"].includes(command)) {
    atividadesCommand(parsed);
    return;
  }

  if (["agentes", "agents"].includes(command)) {
    agentesCommand(parsed);
    return;
  }

  if (["status", "estado", "resumo", "summary"].includes(command)) {
    statusCommand(parsed);
    return;
  }

  if (["registrar", "register", "adicionar-projeto", "track"].includes(command)) {
    registerExistingProject(parsed);
    return;
  }

  if (["listar", "list", "projetos", "projects"].includes(command)) {
    listProjectsCommand(parsed);
    return;
  }

  if (["remover", "remove", "deletar", "delete"].includes(command)) {
    await removeProjectCommand(parsed);
    return;
  }

  if (["onboarding", "onboard", "conhecer", "intro", "introducao", "introdução"].includes(command)) {
    await runOnboarding();
    return;
  }

  if (["create", "criar", "novo", "new"].includes(command)) {
    await createProject(parsed);
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error) => {
  ui.fail(error.message);
  process.exitCode = 1;
});
