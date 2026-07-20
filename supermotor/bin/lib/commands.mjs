import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join, relative, resolve } from "node:path";
import { color, ui } from "./ui.mjs";
import { ROOT, TEMPLATE_ROOT, TYPES } from "./constants.mjs";
import { copyTemplate } from "./templates.mjs";
import { commandExists } from "./templates.mjs";
import {
  appendActivity,
  initializeProjectTracking,
  STATE_ROOT,
  listRegisteredProjects,
  unregisterProject,
  readActivities,
  readAgents,
  readProjectMetadata,
} from "../supermotor-state.mjs";

function recordActivity(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  if (!existsSync(join(project, ".supermotor", "project.json"))) {
    throw new Error(`Projeto SUPERMOTOR nao encontrado em: ${project}\nDica: rode supermotor registrar <pasta> ou supermotor criar para gerar um novo projeto.`);
  }
  const activity = appendActivity(project, {
    agent: parsed.options.agent || parsed.options.agente || "Agente",
    status: parsed.options.status || "working",
    action: parsed.options.action || parsed.options.acao || parsed.options["a\u00e7\u00e3o"] || "Atualizando o projeto",
    detail: parsed.options.detail || parsed.options.detalhe || "",
  });
  ui.ok(`${activity.agent}: ${activity.action}`);
}

function registerExistingProject(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  if (!existsSync(project) || !statSync(project).isDirectory()) {
    throw new Error(`Projeto nao encontrado: ${project}\nDica: verifique o caminho ou rode supermotor listar.`);
  }
  let packageMetadata = {};
  const packagePath = join(project, "package.json");
  if (existsSync(packagePath)) {
    try {
      packageMetadata = JSON.parse(readFileSync(packagePath, "utf8"));
    } catch {
      ui.warn("package.json inv\u00e1lido; usando o nome da pasta.");
    }
  }
  const inferredCrm = existsSync(join(project, "src", "app", "layout.tsx")) && existsSync(join(project, "supabase", "migrations"));
  copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(project, ".supermotor"));
  const metadata = initializeProjectTracking(project, {
    projectType: parsed.options.tipo || parsed.options.type || (inferredCrm ? "crm" : "project"),
    name: parsed.options.nome || parsed.options.name || packageMetadata.name || project.split(/[\\/]/).pop(),
    objective: parsed.options.brief || parsed.options.objetivo || "Projeto existente registrado para acompanhamento local.",
    success: parsed.options.sucesso || "Tarefas, agentes e entregas acompanhados com clareza.",
    essentials: parsed.options.essenciais || "Preservar o que j\u00e1 funciona e concluir o fluxo principal.",
    constraints: parsed.options.restricoes || "N\u00e3o registrar segredos ou dados confidenciais no hist\u00f3rico de atividades.",
    brand: parsed.options.marca || "",
    motorVersion: "3.0.0",
  });
  ui.ok(`Projeto registrado no painel: ${metadata.name}`);
  console.log(`Abra com: ${process.platform === "win32" ? ".\\supermotor.ps1" : "./supermotor.sh"} painel`);
}

function dashboardControlFile() {
  return join(STATE_ROOT, "control-room.json");
}

function readDashboardControl() {
  const path = dashboardControlFile();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function processIsAlive(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function openLocalUrl(url) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(String(url))) return;
  let command;
  let args;
  if (process.platform === "win32") {
    command = process.env.ComSpec || "cmd.exe";
    args = ["/d", "/s", "/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

async function startDashboardDaemon(parsed) {
  const controlPath = dashboardControlFile();
  const existing = readDashboardControl();
  const shouldOpen = !Boolean(parsed.options["nao-abrir"] || parsed.options["n\u00e3o-abrir"] || parsed.options["no-open"]);
  if (existing && processIsAlive(existing.pid)) {
    ui.ok(`Control Room j\u00e1 est\u00e1 ativa em ${existing.url}`);
    if (shouldOpen) openLocalUrl(existing.url);
    return;
  }
  if (existsSync(controlPath)) unlinkSync(controlPath);
  mkdirSync(STATE_ROOT, { recursive: true });
  const port = Number(parsed.options.porta || parsed.options.port || 4545);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Porta invalida para o painel. Use um valor entre 1 e 65535.");
  const args = [join(ROOT, "bin", "dashboard-server.mjs"), "--porta", String(port)];
  if (!shouldOpen) args.push("--nao-abrir");
  const child = spawn(process.execPath, args, {
    detached: true,
    env: { ...process.env, SUPERMOTOR_CONTROL_FILE: controlPath },
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    const control = readDashboardControl();
    if (control?.pid === child.pid && processIsAlive(control.pid)) {
      ui.ok(`Control Room iniciada em ${control.url}`);
      return;
    }
    if (!processIsAlive(child.pid)) break;
  }
  if (processIsAlive(child.pid)) process.kill(child.pid);
  throw new Error("A Control Room n\u00e3o iniciou. Rode `supermotor painel` para ver o erro no terminal.");
}

function stopDashboardDaemon() {
  const controlPath = dashboardControlFile();
  const control = readDashboardControl();
  if (!control || !processIsAlive(control.pid)) {
    if (existsSync(controlPath)) unlinkSync(controlPath);
    ui.warn("A Control Room n\u00e1 est\u00e1 ativa em segundo plano.");
    return;
  }
  process.kill(Number(control.pid));
  if (existsSync(controlPath)) unlinkSync(controlPath);
  ui.ok("Control Room encerrada.");
}

function dashboardDaemonStatus() {
  const control = readDashboardControl();
  if (control && processIsAlive(control.pid)) ui.ok(`Control Room ativa em ${control.url} (PID ${control.pid})`);
  else ui.warn("Control Room n\u00e3o est\u00e1 ativa em segundo plano.");
}

function doctor() {
  ui.title("SUPERMOTOR \u2014 diagn\u00f3stico");
  let healthy = true;
  const major = Number(process.versions.node.split(".")[0]);

  if (major >= 20) ui.ok(`Node.js ${process.versions.node}`);
  else {
    ui.fail(`Node.js ${process.versions.node}; use a vers\u00e3o 20 ou superior`);
    healthy = false;
  }

  for (const cmd of ["npm", "git"]) {
    if (commandExists(cmd)) ui.ok(`${cmd} disponivel`);
    else {
      ui.fail(`${cmd} nao encontrado`);
      ui.hint(cmd === "npm" ? "Instale o Node.js em https://nodejs.org" : "Instale o Git em https://git-scm.com");
      healthy = false;
    }
  }

  if (commandExists("docker")) ui.ok("Docker dispon\u00edvel para CRM via Supabase local");
  else ui.warn("Para o CRM, tenha uma conta gr\u00e1tis em supabase.com");

  for (const template of ["common", "tracking", ...Object.values(TYPES).map((item) => item.template)]) {
    const path = join(TEMPLATE_ROOT, template);
    if (existsSync(path)) ui.ok(`Template ${template}`);
    else {
      ui.fail(`Template ausente: ${path}`);
      ui.hint("Execute setup.ps1 ou setup.sh para restaurar templates.");
      healthy = false;
    }
  }

  const optionalResources = [
    "libs/impeccable",
    "libs/fallow",
    "libs/graphify",
    "skills/frontend-design.md",
    "skills/ui-ux-pro-max",
  ];
  for (const item of optionalResources) {
    if (existsSync(join(ROOT, item))) ui.ok(item);
    else ui.warn(`${item} ainda n\u00e3o instalado; rode setup.ps1 ou setup.sh`);
  }

  console.log(healthy ? "\nMotor pronto para criar projetos.\n" : "\nCorrija os itens acima antes de criar projetos.\n");
  process.exitCode = healthy ? 0 : 1;
}

function formatRelativeTime(isoString) {
  if (!isoString) return "desconhecido";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atr\u00e1s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atr\u00e1s`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atr\u00e1s`;
  return `${Math.floor(days / 30)}m atr\u00e1s`;
}

function statusEmoji(status) {
  return { planning: "\u{1F4CB}", working: "\u{1F527}", testing: "\u{1F9EA}", reviewing: "\u{1F50D}", blocked: "\u{1F6AB}", done: "\u{2705}", idle: "\u{1F4A4}" }[status] || "\u{2699}\u{FE0F}";
}

function listProjectsCommand(parsed) {
  const verbose = parsed.options.verbose || parsed.options.v;
  const jsonOutput = parsed.options.json;

  const projects = listRegisteredProjects();
  if (jsonOutput) {
    const data = projects.map((project) => ({
      name: project.name,
      type: project.type,
      path: project.path,
      brand: project.brand || undefined,
      objective: project.objective || undefined,
      createdAt: project.createdAt,
      lastSeenAt: project.lastSeenAt,
    }));
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  ui.title("SUPERMOTOR \u2014 projetos");
  if (!projects.length) {
    console.log("  Nenhum projeto registrado.\n");
    console.log("  Use: supermotor registrar <caminho> para registrar um projeto existente.");
    console.log("  Use: supermotor criar para criar um novo projeto.\n");
    return;
  }

  const typeColors = { site: "36", app: "35", carousel: "33", crm: "32", project: "37" };

  for (const project of projects) {
    const type = project.type || "project";
    const typeLabel = TYPES[type]?.label || type;
    const statusColor = typeColors[type] || "37";

    console.log(`  ${color(statusColor, typeLabel.padEnd(20))} ${project.name || "Sem nome"}`);
    console.log(`    ${color("2", `Caminho: ${project.path}`)}`);
    if (project.brand) console.log(`    ${color("2", `Marca: ${project.brand}`)}`);

    if (verbose) {
      const metadata = readProjectMetadata(project.path);
      const agents = readAgents(project.path);
      const activities = readActivities(project.path, 3);

      if (metadata.objective) console.log(`    ${color("2", `Objetivo: ${metadata.objective}`)}`);
      if (project.createdAt) console.log(`    ${color("2", `Criado: ${formatRelativeTime(project.createdAt)}`)}`);
      if (project.lastSeenAt) console.log(`    ${color("2", `Visto: ${formatRelativeTime(project.lastSeenAt)}`)}`);

      if (agents.length) {
        console.log(`    ${color("2", "Agentes:")}`);
        for (const agent of agents.slice(0, 3)) {
          console.log(`      ${statusEmoji(agent.status)} ${agent.name}: ${agent.action || "idle"}`);
        }
      }

      if (activities.length) {
        console.log(`    ${color("2", "Atividade recente:")}`);
        for (const act of activities.slice(0, 2)) {
          console.log(`      ${color("2", `${act.agent}: ${act.action}`)}`);
        }
      }
    }

    console.log();
  }

  console.log(`  ${color("2", `${projects.length} projeto(s) registrado(s).`)}`);
  console.log(`  ${color("2", "Use --verbose para mais detalhes")}`);
  console.log(`  ${color("2", "Abra o painel para ver detalhes: supermotor painel")}\n`);
}

async function removeProjectCommand(parsed) {
  const { rmSync } = await import("node:fs");
  const requestedPath = parsed.positionals[1];
  if (!requestedPath) {
    throw new Error("Especifique o caminho do projeto: supermotor remover <caminho>");
  }

  const project = resolve(process.cwd(), requestedPath);
  if (!existsSync(project) || !statSync(project).isDirectory()) {
    throw new Error(`Projeto nao encontrado: ${project}\nDica: verifique o caminho ou rode supermotor listar.`);
  }

  const trackingDir = join(project, ".supermotor");
  if (!existsSync(trackingDir)) {
    throw new Error(`Projeto nao registrado no SUPERMOTOR: ${project}\nDica: rode supermotor registrar <pasta> para registrar um projeto existente.`);
  }

  const shouldDelete = parsed.options.deletar || parsed.options.delete;
  const force = parsed.options.forcar || parsed.options.force;
  const dryRun = parsed.options["dry-run"];

  const metadata = readProjectMetadata(project);
  const projectName = metadata.name || project.split(/[\\/]/).pop();

  if (dryRun) {
    ui.info(`[DRY RUN] Projeto: ${projectName}`);
    ui.info(`[DRY_RUN] Caminho: ${project}`);
    if (shouldDelete) {
      ui.info("[DRY_RUN] Acao: Deletar projeto e arquivos");
    } else {
      ui.info("[DRY_RUN] Acao: Remover registro do SUPERMOTOR");
    }
    return;
  }

  if (!force && input.isTTY) {
    console.log();
    console.log(`  Projeto: ${color("1;37", projectName)}`);
    console.log(`  Caminho: ${color("2", project)}`);
    if (shouldDelete) {
      console.log(`  ${color("33", "ATENCAO: Todos os arquivos serao deletados!")}`);
    } else {
      console.log(`  Apenas o registro do SUPERMOTOR sera removido.`);
    }
    console.log();

    const terminal = createInterface({ input, output });
    try {
      const answer = (await terminal.question("  Confirmar? [s/N]: ")).trim().toLowerCase();
      if (!["s", "sim"].includes(answer)) {
        console.log("  Operacao cancelada.\n");
        return;
      }
    } finally {
      terminal.close();
    }
  }

  if (shouldDelete) {
    rmSync(project, { recursive: true, force: true });
    unregisterProject(project);
    ui.ok(`Projeto deletado: ${projectName}`);
  } else {
    rmSync(trackingDir, { recursive: true, force: true });
    unregisterProject(project);
    ui.ok(`Registro do SUPERMOTOR removido de: ${projectName}`);
    ui.info("Os arquivos do projeto foram preservados.");
    ui.info("Para deletar os arquivos, use: supermotor remover <caminho> --deletar");
  }
}

function atividadesCommand(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);

  if (!existsSync(join(project, ".supermotor", "project.json"))) {
    throw new Error(`Projeto SUPERMOTOR nao encontrado em: ${project}\nDica: rode supermotor registrar <pasta> ou supermotor criar para gerar um novo projeto.`);
  }

  const limit = Number(parsed.options.limite || parsed.options.limit || 10);
  const activities = readActivities(project, limit);

  ui.title("SUPERMOTOR \u2014 atividades");
  ui.info(`Projeto: ${project.split(/[\\/]/).pop()}`);

  if (!activities.length) {
    console.log("  Nenhuma atividade registrada.\n");
    return;
  }

  for (const act of activities) {
    const time = formatRelativeTime(act.timestamp);
    console.log(`  ${statusEmoji(act.status)} ${color("1;37", act.agent)} ${color("2", `(${time})`)}`);
    console.log(`    ${act.action}`);
    if (act.detail) console.log(`    ${color("2", act.detail)}`);
    console.log();
  }
}

function agentesCommand(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);

  if (!existsSync(join(project, ".supermotor", "project.json"))) {
    throw new Error(`Projeto SUPERMOTOR nao encontrado em: ${project}\nDica: rode supermotor registrar <pasta> ou supermotor criar para gerar um novo projeto.`);
  }

  const agents = readAgents(project);

  ui.title("SUPERMOTOR \u2014 agentes");
  ui.info(`Projeto: ${project.split(/[\\/]/).pop()}`);

  if (!agents.length) {
    console.log("  Nenhum agente registrado.\n");
    return;
  }

  for (const agent of agents) {
    const time = formatRelativeTime(agent.updatedAt);
    console.log(`  ${statusEmoji(agent.status)} ${color("1;37", agent.name)} ${color("2", `[${agent.status}]`)}`);
    if (agent.action) console.log(`    ${agent.action}`);
    if (agent.detail) console.log(`    ${color("2", agent.detail)}`);
    console.log(`    ${color("2", `Atualizado: ${time}`)}`);
    console.log();
  }
}

function statusCommand(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);

  if (!existsSync(join(project, ".supermotor", "project.json"))) {
    throw new Error(`Projeto SUPERMOTOR nao encontrado em: ${project}\nDica: rode supermotor registrar <pasta> ou supermotor criar para gerar um novo projeto.`);
  }

  const metadata = readProjectMetadata(project);
  const agents = readAgents(project);
  const activities = readActivities(project, 5);

  ui.title("SUPERMOTOR \u2014 status do projeto");

  console.log(`  ${color("1;37", "Nome:")} ${metadata.name || "Sem nome"}`);
  console.log(`  ${color("1;37", "Tipo:")} ${TYPES[metadata.projectType]?.label || metadata.projectType || "Desconhecido"}`);
  console.log(`  ${color("1;37", "Marca:")} ${metadata.brand || "Sem marca"}`);
  if (metadata.objective) console.log(`  ${color("1;37", "Objetivo:")} ${metadata.objective}`);
  if (metadata.createdAt) console.log(`  ${color("1;37", "Criado:")} ${formatRelativeTime(metadata.createdAt)}`);
  console.log();

  if (agents.length) {
    console.log(`  ${color("1;37", "Agentes ativos:")}`);
    for (const agent of agents) {
      console.log(`    ${statusEmoji(agent.status)} ${agent.name}: ${agent.action || "idle"}`);
    }
    console.log();
  }

  if (activities.length) {
    console.log(`  ${color("1;37", "Atividade recente:")}`);
    for (const act of activities.slice(0, 5)) {
      const time = formatRelativeTime(act.timestamp);
      console.log(`    ${statusEmoji(act.status)} ${act.agent}: ${act.action} ${color("2", `(${time})`)}`);
    }
    console.log();
  }
}

export {
  recordActivity,
  registerExistingProject,
  startDashboardDaemon,
  stopDashboardDaemon,
  dashboardDaemonStatus,
  doctor,
  listProjectsCommand,
  removeProjectCommand,
  atividadesCommand,
  agentesCommand,
  statusCommand,
};
