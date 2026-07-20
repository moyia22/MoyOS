import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export const MOTOR_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STATE_ROOT = resolve(process.env.SUPERMOTOR_STATE_ROOT || join(MOTOR_ROOT, ".supermotor-state"));
export const PROJECTS_FILE = join(STATE_ROOT, "projects.json");
export const DEFAULT_PROJECTS_ROOT = resolve(process.env.SUPERMOTOR_PROJECTS_ROOT || join(MOTOR_ROOT, "projetos"));

const VALID_STATUSES = new Set(["planning", "working", "testing", "reviewing", "blocked", "done", "idle"]);

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function samePath(left, right) {
  const a = resolve(left);
  const b = resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function protectLocalTrackingFiles(projectPath) {
  const gitignorePath = join(projectPath, ".gitignore");
  const current = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
  const entries = [".supermotor/activity.jsonl", ".supermotor/agents.json"];
  const missing = entries.filter((entry) => !current.split(/\r?\n/).some((line) => line.includes(entry)));
  if (!missing.length) return;
  const separator = current && !current.endsWith("\n") ? "\n" : "";
  writeFileSync(gitignorePath, `${current}${separator}\n# SUPERMOTOR — atividade local dos agentes\n${missing.join("\n")}\n`, "utf8");
}

export function projectTrackingDirectory(projectPath) {
  return join(resolve(projectPath), ".supermotor");
}

export function registerProject(projectPath, metadata = {}) {
  const absolutePath = resolve(projectPath);
  const now = new Date().toISOString();
  const projects = readJson(PROJECTS_FILE, []);
  const current = projects.find((project) => samePath(project.path, absolutePath));
  const record = {
    id: current?.id || metadata.id || randomUUID(),
    name: metadata.name || current?.name || absolutePath.split(/[\\/]/).pop(),
    type: metadata.projectType || metadata.type || current?.type || "project",
    path: absolutePath,
    objective: metadata.objective || current?.objective || "",
    brand: metadata.brand || current?.brand || "",
    createdAt: current?.createdAt || metadata.createdAt || now,
    lastSeenAt: now,
  };
  const next = projects.filter((project) => !samePath(project.path, absolutePath));
  next.push(record);
  writeJson(PROJECTS_FILE, next.sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))));
  return record;
}

export function initializeProjectTracking(projectPath, metadata = {}) {
  const absolutePath = resolve(projectPath);
  const tracking = projectTrackingDirectory(absolutePath);
  mkdirSync(tracking, { recursive: true });
  const metadataPath = join(tracking, "project.json");
  const existing = readJson(metadataPath, {});
  const project = {
    ...existing,
    ...metadata,
    id: existing.id || metadata.id || randomUUID(),
    path: undefined,
    createdAt: existing.createdAt || metadata.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  delete project.path;
  writeJson(metadataPath, project);
  protectLocalTrackingFiles(absolutePath);
  registerProject(absolutePath, project);

  const activityPath = join(tracking, "activity.jsonl");
  if (!existsSync(activityPath)) {
    appendActivity(absolutePath, {
      agent: "SUPERMOTOR",
      status: "done",
      action: "Projeto preparado",
      detail: "Contexto, acompanhamento de agentes e qualidade inicial configurados.",
      silentRegistry: true,
    });
  }
  return project;
}

export function appendActivity(projectPath, event = {}) {
  const absolutePath = resolve(projectPath);
  const tracking = projectTrackingDirectory(absolutePath);
  mkdirSync(tracking, { recursive: true });
  const status = VALID_STATUSES.has(String(event.status).toLowerCase()) ? String(event.status).toLowerCase() : "working";
  const activity = {
    id: event.id || randomUUID(),
    timestamp: event.timestamp || new Date().toISOString(),
    agent: String(event.agent || "Agente").trim().slice(0, 80),
    status,
    action: String(event.action || "Atualizando o projeto").trim().slice(0, 180),
    detail: String(event.detail || "").trim().slice(0, 1200),
  };
  appendFileSync(join(tracking, "activity.jsonl"), `${JSON.stringify(activity)}\n`, "utf8");

  const agentsPath = join(tracking, "agents.json");
  const agents = readJson(agentsPath, {});
  agents[activity.agent] = {
    name: activity.agent,
    status: activity.status,
    action: activity.action,
    detail: activity.detail,
    updatedAt: activity.timestamp,
  };
  writeJson(agentsPath, agents);

  if (!event.silentRegistry) {
    const metadata = readJson(join(tracking, "project.json"), {});
    registerProject(absolutePath, metadata);
  }
  return activity;
}

export function readActivities(projectPath, limit = 80) {
  const path = join(projectTrackingDirectory(projectPath), "activity.jsonl");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    })
    .reverse();
}

export function readAgents(projectPath) {
  const agents = readJson(join(projectTrackingDirectory(projectPath), "agents.json"), {});
  return Object.values(agents).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function readProjectMetadata(projectPath) {
  return readJson(join(projectTrackingDirectory(projectPath), "project.json"), {});
}

export function listRegisteredProjects() {
  const registered = readJson(PROJECTS_FILE, []);
  const candidates = [...registered];
  if (existsSync(DEFAULT_PROJECTS_ROOT)) {
    for (const entry of readdirSync(DEFAULT_PROJECTS_ROOT)) {
      const path = join(DEFAULT_PROJECTS_ROOT, entry);
      if (!statSync(path).isDirectory()) continue;
      if (!candidates.some((project) => samePath(project.path, path))) {
        const metadata = readProjectMetadata(path);
        candidates.push({
          id: metadata.id || `discovered-${entry}`,
          name: metadata.name || entry,
          type: metadata.projectType || "project",
          path,
          objective: metadata.objective || "",
          brand: metadata.brand || "",
          createdAt: metadata.createdAt || statSync(path).birthtime.toISOString(),
          lastSeenAt: statSync(path).mtime.toISOString(),
        });
      }
    }
  }
  return candidates
    .filter((project) => project.path && existsSync(project.path) && statSync(project.path).isDirectory())
    .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
}

export function findRegisteredProject(identifier) {
  const projects = listRegisteredProjects();
  return projects.find((project) => project.id === identifier || samePath(project.path, identifier));
}

export function unregisterProject(projectPath) {
  const absolutePath = resolve(projectPath);
  const projects = readJson(PROJECTS_FILE, []);
  const next = projects.filter((project) => !samePath(project.path, absolutePath));
  writeJson(PROJECTS_FILE, next);
}
