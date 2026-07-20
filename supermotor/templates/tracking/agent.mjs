#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const TRACKING_ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(TRACKING_ROOT, "..");
const STATUS_BY_COMMAND = {
  start: "working",
  iniciar: "working",
  update: "working",
  atualizar: "working",
  plan: "planning",
  planejar: "planning",
  test: "testing",
  testar: "testing",
  review: "reviewing",
  revisar: "reviewing",
  blocked: "blocked",
  bloqueado: "blocked",
  done: "done",
  concluir: "done",
  idle: "idle",
  pausar: "idle",
};

function parseArgs(argv) {
  const positionals = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else options[key] = true;
  }
  return { positionals, options };
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const { positionals, options } = parseArgs(process.argv.slice(2));
const command = String(positionals.shift() || "update").toLowerCase();
if (["help", "ajuda", "-h"].includes(command) || options.help) {
  console.log(`
Uso:
  node .supermotor/agent.mjs start --agent "Codex" --action "Implementando autenticação"
  node .supermotor/agent.mjs update --agent "Codex" --action "API concluída" --detail "Iniciando testes"
  node .supermotor/agent.mjs test --agent "QA" --action "Validando fluxo principal"
  node .supermotor/agent.mjs blocked --agent "Codex" --action "Aguardando credencial"
  node .supermotor/agent.mjs done --agent "Codex" --action "Tarefa concluída"
`);
  process.exit(0);
}

mkdirSync(TRACKING_ROOT, { recursive: true });
const agent = String(options.agent || options.agente || process.env.SUPERMOTOR_AGENT || process.env.CODEX_AGENT_NAME || "Agente").trim().slice(0, 80);
const status = STATUS_BY_COMMAND[command] || String(options.status || "working").toLowerCase();
const action = String(options.action || options.acao || options["ação"] || positionals.join(" ") || "Atualizando o projeto").trim().slice(0, 180);
const detail = String(options.detail || options.detalhe || "").trim().slice(0, 1200);
const event = {
  id: randomUUID(),
  timestamp: new Date().toISOString(),
  agent,
  status,
  action,
  detail,
};

appendFileSync(join(TRACKING_ROOT, "activity.jsonl"), `${JSON.stringify(event)}\n`, "utf8");
const agentsPath = join(TRACKING_ROOT, "agents.json");
const agents = readJson(agentsPath, {});
agents[agent] = { name: agent, status, action, detail, updatedAt: event.timestamp };
writeFileSync(agentsPath, `${JSON.stringify(agents, null, 2)}\n`, "utf8");
console.log(`SUPERMOTOR: ${agent} → ${status} — ${action}`);
console.log(`Projeto: ${PROJECT_ROOT}`);

