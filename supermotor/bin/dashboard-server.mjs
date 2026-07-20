import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, watch, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  MOTOR_ROOT,
  appendActivity,
  findRegisteredProject,
  listRegisteredProjects,
  readActivities,
  readAgents,
  readProjectMetadata,
} from "./supermotor-state.mjs";

const DASHBOARD_ROOT = join(MOTOR_ROOT, "dashboard");
const HOST = "127.0.0.1";
const STATIC_ROUTES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
]);
const FILE_CACHE = new Map();
const IGNORED_DIRECTORIES = new Set([".git", ".next", ".supermotor", "node_modules", "dist", "build", "coverage", ".turbo", ".cache"]);
const STATUS_PROGRESS = { planning: 18, working: 48, blocked: 48, testing: 76, reviewing: 88, done: 100, idle: 10 };
const FILE_WATCHERS = new Map();
const SSE_CLIENTS = new Set();
const FILE_CHANGE_BUFFER = new Map();
const FLUSH_INTERVAL_MS = 800;

function safeTextFile(path, maxLength = 5000) {
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf8").slice(0, maxLength);
  } catch {
    return "";
  }
}

function recentFiles(projectPath) {
  const cached = FILE_CACHE.get(projectPath);
  if (cached && Date.now() - cached.timestamp < 4000) return cached.files;
  const files = [];
  const queue = [projectPath];
  let inspected = 0;
  while (queue.length && inspected < 2400) {
    const directory = queue.shift();
    let entries = [];
    try {
      entries = readdirSync(directory);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
      const path = join(directory, entry);
      let stats;
      try {
        stats = statSync(path);
      } catch {
        continue;
      }
      inspected += 1;
      if (stats.isDirectory()) queue.push(path);
      else {
        files.push({
          path: relative(projectPath, path).replaceAll("\\", "/"),
          updatedAt: stats.mtime.toISOString(),
          size: stats.size,
        });
      }
      if (inspected >= 2400) break;
    }
  }
  const result = files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
  FILE_CACHE.set(projectPath, { timestamp: Date.now(), files: result });
  return result;
}

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of SSE_CLIENTS) {
    try { client.write(payload); } catch { SSE_CLIENTS.delete(client); }
  }
}

function startFileWatcher(projectPath, projectId) {
  if (FILE_WATCHERS.has(projectPath)) return;
  let watcher;
  try {
    watcher = watch(projectPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const parts = filename.split(/[/\\]/);
      if (parts.some((part) => IGNORED_DIRECTORIES.has(part))) return;
      if (!FILE_CHANGE_BUFFER.has(projectId)) {
        FILE_CHANGE_BUFFER.set(projectId, { changes: [], timer: null });
      }
      const buffer = FILE_CHANGE_BUFFER.get(projectId);
      buffer.changes.push({ type: eventType, path: filename, at: new Date().toISOString() });
      if (buffer.changes.length > 20) buffer.changes = buffer.changes.slice(-20);
      if (!buffer.timer) {
        buffer.timer = setTimeout(() => {
          FILE_CACHE.delete(projectPath);
          const state = getDashboardState();
          broadcastSSE("state", state);
          FILE_CHANGE_BUFFER.delete(projectId);
        }, FLUSH_INTERVAL_MS);
      }
    });
    FILE_WATCHERS.set(projectPath, watcher);
  } catch {
    // File watching not supported on this filesystem
  }
}

function stopAllFileWatchers() {
  for (const [path, watcher] of FILE_WATCHERS) {
    try { watcher.close(); } catch { /* ignore */ }
  }
  FILE_WATCHERS.clear();
  for (const buffer of FILE_CHANGE_BUFFER.values()) {
    if (buffer.timer) clearTimeout(buffer.timer);
  }
  FILE_CHANGE_BUFFER.clear();
}

function conversationFor(projectPath, type) {
  const crmPath = join(projectPath, ".supermotor", "CONVERSATION.md");
  const standardPath = join(projectPath, "CONVERSATION.md");
  return safeTextFile(type === "crm" ? crmPath : existsSync(standardPath) ? standardPath : crmPath, 5000);
}

function suggestedPrompt(project, metadata, agents, activities, conversation) {
  const active = agents.filter((agent) => !["done", "idle"].includes(agent.status));
  const latest = activities[0];
  const contextPath = metadata.projectType === "crm" ? ".supermotor/CONVERSATION.md" : "CONVERSATION.md";
  return [
    `Trabalhe no projeto “${metadata.name || project.name}”.`,
    `Leia AGENTS.md, ${contextPath} e os arquivos de produto, marca, qualidade e superprompt antes de alterar código.`,
    "Registre seu andamento com node .supermotor/agent.mjs para que eu acompanhe no painel.",
    metadata.objective ? `Objetivo: ${metadata.objective}` : "",
    metadata.success ? `Sucesso esperado: ${metadata.success}` : "",
    active.length ? `Agentes em andamento: ${active.map((agent) => `${agent.name} — ${agent.action}`).join("; ")}.` : "",
    latest ? `Última atividade: ${latest.agent} — ${latest.action}.` : "",
    "Implemente com autonomia quando houver contexto suficiente, teste o resultado e informe claramente o que concluiu ou o que bloqueou o avanço.",
    conversation ? "Use o contexto conversacional existente e não repita perguntas já respondidas." : "",
  ].filter(Boolean).join("\n");
}

function hydrateProject(project) {
  const metadata = readProjectMetadata(project.path);
  const type = metadata.projectType || project.type || "project";
  const activities = readActivities(project.path, 60);
  const agents = readAgents(project.path);
  const files = recentFiles(project.path);
  const latestStatus = agents.find((agent) => agent.name !== "SUPERMOTOR")?.status || activities[0]?.status || "idle";
  const activeAgents = agents.filter((agent) => !["done", "idle"].includes(agent.status));
  const blockedAgents = agents.filter((agent) => agent.status === "blocked");
  const conversation = conversationFor(project.path, type);
  return {
    id: project.id || metadata.id,
    name: metadata.name || project.name,
    type,
    path: project.path,
    objective: metadata.objective || project.objective || "",
    success: metadata.success || "",
    essentials: metadata.essentials || "",
    constraints: metadata.constraints || "",
    brand: metadata.brand || project.brand || "",
    createdAt: metadata.createdAt || project.createdAt,
    updatedAt: activities[0]?.timestamp || files[0]?.updatedAt || project.lastSeenAt,
    progress: STATUS_PROGRESS[latestStatus] || 10,
    activeAgentCount: activeAgents.length,
    blockedAgentCount: blockedAgents.length,
    agents,
    activities,
    recentFiles: files,
    conversation,
    suggestedPrompt: suggestedPrompt(project, metadata, agents, activities, conversation),
  };
}

function readOnboardingContext() {
  const contextPath = join(resolve(process.cwd()), "_contexto", "onboarding.md");
  if (!existsSync(contextPath)) return null;
  try {
    return readFileSync(contextPath, "utf8").slice(0, 8000);
  } catch {
    return null;
  }
}

export function getDashboardState() {
  const projects = listRegisteredProjects().map(hydrateProject);
  for (const project of projects) {
    startFileWatcher(project.path, project.id);
  }
  const onboarding = readOnboardingContext();
  return {
    generatedAt: new Date().toISOString(),
    motorVersion: "3.0.0",
    projects,
    onboarding,
    summary: {
      projects: projects.length,
      activeAgents: projects.reduce((total, project) => total + project.activeAgentCount, 0),
      blockedAgents: projects.reduce((total, project) => total + project.blockedAgentCount, 0),
      recentChanges: projects.reduce((total, project) => total + project.recentFiles.length, 0),
      hasOnboarding: Boolean(onboarding),
    },
  };
}

function json(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

function readRequestBody(request, maxBytes = 32_768) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxBytes) reject(new Error("Corpo da requisição muito grande"));
    });
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
}

function serveStatic(pathname, response) {
  const route = STATIC_ROUTES.get(pathname);
  if (!route) return false;
  const [fileName, contentType] = route;
  const path = join(DASHBOARD_ROOT, fileName);
  if (!existsSync(path)) {
    json(response, 500, { error: `Arquivo do painel ausente: ${fileName}` });
    return true;
  }
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  response.end(readFileSync(path));
  return true;
}

async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${HOST}`);
  if (request.method === "GET" && serveStatic(url.pathname, response)) return;

  if (request.method === "GET" && url.pathname === "/api/state") {
    json(response, 200, getDashboardState());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    SSE_CLIENTS.add(response);
    const send = () => response.write(`event: state\ndata: ${JSON.stringify(getDashboardState())}\n\n`);
    send();
    const timer = setInterval(send, 2000);
    request.on("close", () => {
      clearInterval(timer);
      SSE_CLIENTS.delete(response);
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/onboarding") {
    const onboarding = readOnboardingContext();
    json(response, 200, { onboarding });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/activity") {
    if (request.headers["x-supermotor-request"] !== "dashboard" || !String(request.headers["content-type"] || "").includes("application/json")) {
      json(response, 403, { error: "Requisição não autorizada" });
      return;
    }
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const project = findRegisteredProject(String(payload.projectId || ""));
      if (!project) {
        json(response, 404, { error: "Projeto não encontrado" });
        return;
      }
      const activity = appendActivity(project.path, {
        agent: payload.agent,
        status: payload.status,
        action: payload.action,
        detail: payload.detail,
      });
      FILE_CACHE.delete(project.path);
      json(response, 201, { activity, state: getDashboardState() });
    } catch (error) {
      json(response, 400, { error: error.message || "Atividade inválida" });
    }
    return;
  }

  json(response, 404, { error: "Rota não encontrada" });
}

function openBrowser(url) {
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

function listen(server, port) {
  return new Promise((resolveListen, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, HOST);
  });
}

export async function startDashboard({ port = 4545, open = true } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Porta inválida para o painel.");
  let selectedPort = port;
  let server;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    server = createServer((request, response) => {
      handleRequest(request, response).catch((error) => json(response, 500, { error: error.message || "Erro interno" }));
    });
    try {
      await listen(server, selectedPort);
      break;
    } catch (error) {
      server.close();
      if (error.code !== "EADDRINUSE" || port === 0 || attempt === 9) throw error;
      selectedPort += 1;
    }
  }
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : selectedPort;
  const url = `http://${HOST}:${actualPort}`;
  if (process.env.SUPERMOTOR_CONTROL_FILE) {
    const controlFile = resolve(process.env.SUPERMOTOR_CONTROL_FILE);
    mkdirSync(dirname(controlFile), { recursive: true });
    writeFileSync(controlFile, `${JSON.stringify({ pid: process.pid, port: actualPort, url, startedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
  }
  console.log(`\nSUPERMOTOR Control Room rodando em ${url}`);
  console.log("Acesso restrito a este computador. Pressione Ctrl+C para encerrar.\n");
  if (open) openBrowser(url);
  server.on("close", stopAllFileWatchers);
  return { server, url };
}

const executedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedDirectly) {
  const portIndex = process.argv.findIndex((arg) => arg === "--porta" || arg === "--port");
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4545;
  startDashboard({ port, open: !process.argv.includes("--nao-abrir") }).catch((error) => {
    console.error(`Não foi possível iniciar o painel: ${error.message}`);
    process.exitCode = 1;
  });
}
