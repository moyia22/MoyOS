import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMP_ROOT = join(ROOT, ".supermotor-tmp", "dashboard");
const PROJECT = join(TEMP_ROOT, "projeto-painel");
const CLI = join(ROOT, "bin", "supermotor.mjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeClean(path) {
  const resolvedPath = resolve(path);
  const safeBase = resolve(ROOT, ".supermotor-tmp");
  assert(resolvedPath.startsWith(`${safeBase}\\`) || resolvedPath.startsWith(`${safeBase}/`), "Limpeza fora da área segura bloqueada");
  if (existsSync(resolvedPath)) rmSync(resolvedPath, { recursive: true, force: true });
}

safeClean(TEMP_ROOT);
mkdirSync(join(PROJECT, "src"), { recursive: true });
writeFileSync(join(PROJECT, "CONVERSATION.md"), "# Contexto\n\nConstruir uma experiência clara.\n");
writeFileSync(join(PROJECT, "src", "app.js"), "export const ready = true;\n");
process.env.SUPERMOTOR_STATE_ROOT = join(TEMP_ROOT, "state");
process.env.SUPERMOTOR_PROJECTS_ROOT = join(TEMP_ROOT, "projects-root");

const { appendActivity, initializeProjectTracking } = await import("../bin/supermotor-state.mjs");
initializeProjectTracking(PROJECT, {
  projectType: "app",
  name: "Projeto Painel",
  objective: "Acompanhar agentes em tempo real.",
  success: "Atividades visíveis no navegador.",
  essentials: "Projetos, agentes, histórico e arquivos.",
  constraints: "Tudo local e sem dependências.",
  brand: "SUPERMOTOR",
});
appendActivity(PROJECT, { agent: "Codex", status: "working", action: "Construindo o painel", detail: "Servidor e interface em integração." });

const { startDashboard } = await import("../bin/dashboard-server.mjs");
const { server, url } = await startDashboard({ port: 0, open: false });

try {
  const page = await fetch(url);
  const html = await page.text();
  assert(page.status === 200 && html.includes("SUPERMOTOR") && html.includes("Control Room"), "Página do painel não carregou");
  assert(String(page.headers.get("content-security-policy")).includes("script-src 'self'"), "CSP do painel ausente");

  const stateResponse = await fetch(`${url}/api/state`);
  const dashboard = await stateResponse.json();
  const project = dashboard.projects.find((item) => item.name === "Projeto Painel");
  assert(project, "Projeto registrado não apareceu no painel");
  assert(project.agents.some((agent) => agent.name === "Codex" && agent.status === "working"), "Agente ativo não apareceu no painel");
  assert(project.recentFiles.some((file) => file.path === "src/app.js"), "Arquivos recentes não foram detectados");
  assert(project.suggestedPrompt.includes("Registre seu andamento"), "Prompt conversacional não foi gerado");

  const activityResponse = await fetch(`${url}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Supermotor-Request": "dashboard" },
    body: JSON.stringify({ projectId: project.id, agent: "QA", status: "testing", action: "Validando o painel" }),
  });
  const activity = await activityResponse.json();
  assert(activityResponse.status === 201, `API de atividade falhou: ${activity.error || activityResponse.status}`);
  assert(activity.state.projects[0].agents.some((agent) => agent.name === "QA"), "Atualização manual não apareceu no estado");

  const forbidden = await fetch(`${url}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: project.id, action: "Não autorizado" }),
  });
  assert(forbidden.status === 403, "API aceitou atualização sem cabeçalho local de proteção");

  console.log("✓ Painel local: página, segurança, projetos, agentes, arquivos e atualização ao vivo aprovados");
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

const probe = createNetServer();
await new Promise((resolveListen) => probe.listen(0, "127.0.0.1", resolveListen));
const daemonPort = probe.address().port;
await new Promise((resolveClose) => probe.close(resolveClose));
const daemonEnv = { ...process.env, SUPERMOTOR_STATE_ROOT: join(TEMP_ROOT, "daemon-state"), SUPERMOTOR_PROJECTS_ROOT: join(TEMP_ROOT, "projects-root") };
const startOutput = execFileSync(process.execPath, [CLI, "painel", "iniciar", "--porta", String(daemonPort), "--nao-abrir"], { cwd: ROOT, encoding: "utf8", env: daemonEnv });
assert(startOutput.includes("Control Room iniciada"), "Painel em segundo plano não iniciou");
const daemonPage = await fetch(`http://127.0.0.1:${daemonPort}`);
assert(daemonPage.status === 200, "Painel em segundo plano não respondeu");
const statusOutput = execFileSync(process.execPath, [CLI, "painel", "status"], { cwd: ROOT, encoding: "utf8", env: daemonEnv });
assert(statusOutput.includes("Control Room ativa"), "Status do painel em segundo plano incorreto");
const stopOutput = execFileSync(process.execPath, [CLI, "painel", "parar"], { cwd: ROOT, encoding: "utf8", env: daemonEnv });
assert(stopOutput.includes("Control Room encerrada"), "Painel em segundo plano não encerrou");
console.log("✓ Control Room em segundo plano: iniciar, status e parar aprovados");

safeClean(TEMP_ROOT);
