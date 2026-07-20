import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { color, ui } from "./ui.mjs";
import { ROOT, TEMPLATE_ROOT, TYPES } from "./constants.mjs";
import { copyTemplate } from "./templates.mjs";
import { commandExists } from "./templates.mjs";
import { appendActivity, initializeProjectTracking, STATE_ROOT, listRegisteredProjects, unregisterProject } from "../supermotor-state.mjs";

function recordActivity(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  if (!existsSync(join(project, ".supermotor", "project.json"))) {
    throw new Error(`Projeto SUPERMOTOR n\u00e3o encontrado em: ${project}`);
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
    throw new Error(`Projeto n\u00e3o encontrado: ${project}`);
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
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Porta inv\u00e1lida para o painel.");
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
    ui.warn("A Control Room n\u00e3o est\u00e1 ativa em segundo plano.");
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
    if (commandExists(cmd)) ui.ok(`${cmd} dispon\u00edvel`);
    else {
      ui.fail(`${cmd} n\u00e3o encontrado`);
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

function listProjectsCommand() {
  ui.title("SUPERMOTOR \u2014 projetos");
  const projects = listRegisteredProjects();
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
    console.log();
  }

  console.log(`  ${color("2", `${projects.length} projeto(s) registrado(s).`)}`);
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
    throw new Error(`Projeto n\u00e3o encontrado: ${project}`);
  }

  const trackingDir = join(project, ".supermotor");
  if (!existsSync(trackingDir)) {
    throw new Error(`Projeto n\u00e3o registrado no SUPERMOTOR: ${project}`);
  }

  const shouldDelete = parsed.options.deletar || parsed.options.delete;
  if (shouldDelete) {
    rmSync(project, { recursive: true, force: true });
    unregisterProject(project);
    ui.ok(`Projeto removido: ${project}`);
  } else {
    rmSync(trackingDir, { recursive: true, force: true });
    unregisterProject(project);
    ui.ok(`Registro do SUPERMOTOR removido de: ${project}`);
    ui.info("Os arquivos do projeto foram preservados.");
    ui.info("Para deletar os arquivos, use: supermotor remover <caminho> --deletar");
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
};
