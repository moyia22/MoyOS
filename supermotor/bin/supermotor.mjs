#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./lib/ui.mjs";
import { ui, color } from "./lib/ui.mjs";
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
import { loadConfig, updateConfig, resetConfig, getConfigPath, get, set, getAll } from "./lib/config.mjs";
import { setLanguage, t } from "./lib/i18n.mjs";
import { loadPlugins, getAllTypes, listPlugins } from "./lib/plugins.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
let VERSION = "3.0.0";
try { VERSION = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")).version; } catch {}

function help() {
  console.log(`
${color("1;38;5;208", "SUPERMOTOR")} ${color("2", VERSION)} — Motor local para criar projetos de alto nivel

${color("1", "Uso:")}
  ${color("36", "supermotor")} ${color("37", "onboarding")}
  ${color("36", "supermotor")} ${color("37", "criar")} ${color("33", "<tipo>")} ${color("37", "\"Nome do projeto\"")}
  ${color("36", "supermotor")} ${color("37", "validar")} ${color("2", "[caminho]")}
  ${color("36", "supermotor")} ${color("37", "painel")} ${color("2", "[iniciar|parar|status]")}
  ${color("36", "supermotor")} ${color("37", "listar")} ${color("2", "[--verbose] [--json]")}
  ${color("36", "supermotor")} ${color("37", "doctor")}

${color("1", "Tipos de projeto:")}
  ${color("33", "site")}       Landing page ou site institucional
  ${color("33", "landing")}    Pagina unica focada em conversao
  ${color("33", "app")}        Aplicacao com dashboard e funcionalidades
  ${color("33", "carrossel")}  Carrossel para redes sociais
  ${color("33", "crm")}        CRM completo com Supabase

${color("1", "Comandos:")}
  onboarding    Assistente interativo que conhece voce e seu negocio
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
  config        Gerencia configuracoes do SUPERMOTOR
  plugins       Lista plugins e tipos customizados instalados

${color("1", "Opcoes globais:")}
  --version               Mostra a versao do SUPERMOTOR
  --verbose               Modo detalhado com informacoes extras

${color("1", "Opcoes de criacao:")}
  --brief "objetivo"       Define o objetivo do projeto
  --sucesso "resultado"    Define como medir o sucesso
  --essenciais "itens"     Define o que precisa funcionar primeiro
  --restricoes "limites"   Define integracoes, limites e proibicoes
  --marca "nome"           Define o nome da marca
  --publico "descricao"    Define o publico principal
  --tom "personalidade"    Define a personalidade da marca
  --cor "#ff5a1f"          Define a cor de destaque
  --favicon caminho        Usa um favicon .ico, .png, .jpg ou .svg
  --rapido                  Usa Brand Kit e favicon automaticos
  --saida caminho          Define a pasta exata de destino
  --sem-instalar           Cria os arquivos sem executar npm install
  --sem-build              Pula validacao de build apos criacao

${color("1", "Opcoes de painel:")}
  --porta 4545             Define a porta do painel local
  --nao-abrir              Inicia o painel sem abrir o navegador

${color("1", "Opcoes de listagem:")}
  --verbose                Mostra atividades, agentes e datas
  --json                   Saida em formato JSON

${color("1", "Exemplos:")}
  ${color("2", "supermotor onboarding")}
  ${color("2", "supermotor criar site \"Minha Empresa\"")}
  ${color("2", "supermotor criar app \"Dashboard\" --rapido")}
  ${color("2", "supermotor validar ./meu-projeto")}
  ${color("2", "supermotor listar --verbose")}

`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.positionals[0]?.toLowerCase();

  const cfg = loadConfig();
  if (cfg.language) setLanguage(cfg.language);
  loadPlugins();

  if (parsed.options.help || ["help", "ajuda", "--help", "-h"].includes(command)) {
    help();
    return;
  }

  if (parsed.options.version || ["version", "versao", "versão"].includes(command)) {
    console.log(`supermotor ${VERSION}`);
    return;
  }

  globalThis.SUPERMOTOR_VERBOSE = Boolean(parsed.options.verbose || parsed.options.v);

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
    const cfg = loadConfig();
    await startDashboard({
      port: Number(parsed.options.porta || parsed.options.port || cfg.dashboard?.port || 4545),
      open: parsed.options["nao-abrir"] || parsed.options["não-abrir"] || parsed.options["no-open"] ? false : (cfg.dashboard?.openBrowser !== false),
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

  if (["config", "configuracao", "configuração", "preferencias"].includes(command)) {
    const action = parsed.positionals[1]?.toLowerCase();
    if (action === "reset") {
      resetConfig();
      ui.ok("Configuracao redefinida para os padroes.");
      return;
    }
    if (action === "path") {
      console.log(getConfigPath());
      return;
    }
    const key = parsed.positionals[2];
    const value = parsed.positionals[3];
    if (action === "get" && key) {
      const val = get(key);
      console.log(val !== undefined ? JSON.stringify(val, null, 2) : `Chave '${key}' nao encontrada.`);
      return;
    }
    if (action === "set" && key && value !== undefined) {
      set(key, value);
      ui.ok(`${key} atualizado para ${value}`);
      return;
    }
    if (key && value !== undefined) {
      set(key, value);
      ui.ok(`${key} atualizado para ${value}`);
      return;
    }
    const config = getAll();
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (["create", "criar", "novo", "new"].includes(command)) {
    await createProject(parsed);
    return;
  }

  if (["plugins", "plugin", "extensoes", "extensions"].includes(command)) {
    const plugins = listPlugins();
    ui.title("SUPERMOTOR — plugins");
    if (!plugins.length) {
      console.log("  Nenhum plugin instalado.\n");
      console.log("  Crie uma pasta em plugins/ com um plugin.json para adicionar tipos customizados.\n");
      return;
    }
    for (const p of plugins) {
      console.log(`  ${color("1;37", p.name)} ${color("2", `v${p.version}`)}`);
      console.log(`    Tipo: ${color("33", p.type)}`);
      if (p.description) console.log(`    ${color("2", p.description)}`);
      if (p.author) console.log(`    Autor: ${color("2", p.author)}`);
      console.log();
    }
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error) => {
  ui.fail(error.message);
  if (error.message.includes("Comando desconhecido")) {
    ui.hint("Rode supermotor --help para ver os comandos disponiveis");
  } else if (error.message.includes("EACCES") || error.message.includes("permission")) {
    ui.hint("Erro de percao. Execute o terminal como administrador ou verifique as permissoes da pasta.");
  } else {
    ui.hint("Se o problema persistir, rode supermotor doctor para verificar o ambiente.");
  }
  process.exitCode = 1;
});
