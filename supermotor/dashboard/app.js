const state = {
  dashboard: null,
  selectedId: localStorage.getItem("supermotor:selected-project") || "",
  connected: false,
  toastTimer: null,
  searchQuery: "",
  activityFilter: "all",
};

const elements = Object.fromEntries([
  "connection-dot", "connection-label", "project-count", "project-list", "project-search", "project-type", "project-name", "project-objective",
  "refresh-button", "copy-prompt-button", "copy-prompt-inline", "empty-state", "dashboard-content", "metric-health", "health-bar", "health-breakdown",
  "metric-progress", "project-progress", "metric-agents", "metric-agents-note", "metric-files", "metric-files-size", "metric-updated", "metric-sync", "agents-grid",
  "activity-list", "brief-objective", "brief-success", "brief-essentials", "brief-constraints", "file-list", "project-prompt",
  "activity-form", "activity-agent", "activity-status", "activity-action", "activity-detail", "form-message", "toast",
  "action-copy-prompt", "action-open-code", "action-open-folder", "action-copy-path",
].map((id) => [id, document.getElementById(id)]));

const STATUS_LABELS = {
  planning: "Planejando",
  working: "Trabalhando",
  testing: "Testando",
  reviewing: "Revisando",
  blocked: "Bloqueado",
  done: "Concluído",
  idle: "Pausado",
};

const STATUS_EMOJIS = {
  planning: "📋",
  working: "⚡",
  testing: "🧪",
  reviewing: "👀",
  blocked: "🚫",
  done: "✅",
  idle: "⏸️",
};

const TYPE_LABELS = { site: "SITE", app: "APLICAÇÃO", carousel: "CARROSSEL", crm: "WACRM", project: "PROJETO" };

function selectedProject() {
  const projects = state.dashboard?.projects || [];
  return projects.find((project) => project.id === state.selectedId) || projects[0] || null;
}

function clear(element) {
  element.replaceChildren();
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function initials(name) {
  return String(name || "A").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relativeTime(value) {
  if (!value) return "sem registro";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "agora";
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function dateGroup(timestamp) {
  if (!timestamp) return "Sem data";
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (itemDate.getTime() === today.getTime()) return "Hoje";
  if (itemDate.getTime() === yesterday.getTime()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function calculateHealth(project) {
  if (!project) return { score: 0, label: "Sem dados", factors: [] };
  const factors = [];
  let score = 0;

  const activityScore = Math.min(project.activities.length * 8, 30);
  score += activityScore;
  factors.push({ label: "Atividade", value: activityScore, max: 30, hint: project.activities.length ? `${project.activities.length} registros` : "Registre andamento com agentes" });

  const fileScore = Math.min(project.recentFiles.length * 5, 20);
  score += fileScore;
  factors.push({ label: "Arquivos", value: fileScore, max: 20, hint: project.recentFiles.length ? `${project.recentFiles.length} arquivos recentes` : "Modifique arquivos para gerar movimento" });

  const agentScore = Math.min(project.activeAgentCount * 15, 25);
  score += agentScore;
  factors.push({ label: "Agentes", value: agentScore, max: 25, hint: project.activeAgentCount ? `${project.activeAgentCount} agente(s) ativo(s)` : "Inicie um agente para trabalhar no projeto" });

  const progressScore = Math.round(project.progress * 0.15);
  score += progressScore;
  factors.push({ label: "Progresso", value: progressScore, max: 15, hint: `${project.progress}% concluído` });

  const conversationScore = project.conversation ? 10 : 0;
  score += conversationScore;
  factors.push({ label: "Contexto", value: conversationScore, max: 10, hint: project.conversation ? "CONVERSATION.md preenchido" : "Preencha o contexto conversacional" });

  score -= project.blockedAgentCount * 8;
  if (project.blockedAgentCount > 0) factors.push({ label: "Bloqueios", value: -project.blockedAgentCount * 8, max: 0, hint: `${project.blockedAgentCount} agente(s) bloqueado(s)` });

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, factors };
}

function healthLabel(score) {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Regular";
  if (score >= 20) return "Atenção";
  return "Crítico";
}

function healthColor(score) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "regular";
  if (score >= 20) return "warning";
  return "critical";
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2400);
}

function updateConnection(connected) {
  state.connected = connected;
  elements["connection-dot"].classList.toggle("online", connected);
  elements["connection-label"].textContent = connected ? "Motor conectado ao vivo" : "Reconectando ao motor…";
  elements["metric-sync"].textContent = connected ? "Sincronização ao vivo" : "Tentando reconectar";
}

function renderProjects(projects) {
  clear(elements["project-list"]);
  const query = state.searchQuery.toLowerCase();
  const filtered = query ? projects.filter((p) => p.name.toLowerCase().includes(query) || p.type.toLowerCase().includes(query)) : projects;
  elements["project-count"].textContent = String(filtered.length);
  if (filtered.length === 0 && query) {
    elements["project-list"].append(node("div", "search-empty", "Nenhum projeto encontrado"));
    return;
  }
  for (const project of filtered) {
    const button = node("button", `project-button${project.id === state.selectedId ? " active" : ""}`);
    button.type = "button";
    button.dataset.projectId = project.id;
    button.setAttribute("aria-label", `Abrir projeto ${project.name}`);
    const health = calculateHealth(project);
    const dot = node("span", `project-dot health-${healthColor(health.score)}`);
    dot.setAttribute("aria-hidden", "true");
    const label = node("span", "project-label");
    label.append(node("strong", "", project.name), node("span", "", TYPE_LABELS[project.type] || project.type));
    button.append(dot, label, node("span", "project-progress-mini", `${project.progress}%`));
    button.addEventListener("click", () => {
      state.selectedId = project.id;
      localStorage.setItem("supermotor:selected-project", project.id);
      render();
    });
    elements["project-list"].append(button);
  }
}

function renderAgents(project) {
  clear(elements["agents-grid"]);
  if (!project.agents.length) {
    const empty = node("div", "agent-empty");
    empty.append(node("strong", "", "Nenhum agente se apresentou ainda"), node("p", "", "Peça ao agente para executar o comando de início descrito em AGENTS.md."));
    elements["agents-grid"].append(empty);
    return;
  }
  for (const agent of project.agents) {
    const card = node("article", "agent-card");
    const top = node("div", "agent-card-top");
    const title = node("div", "agent-title");
    title.append(node("strong", "", agent.name), node("span", "", `Atualizado ${relativeTime(agent.updatedAt)}`));
    const statusBadge = node("span", `status-badge ${agent.status}`, `${STATUS_EMOJIS[agent.status] || ""} ${STATUS_LABELS[agent.status] || agent.status}`);
    top.append(node("span", "agent-avatar", initials(agent.name)), title, statusBadge);
    card.append(top, node("p", "agent-action", agent.action || "Sem ação registrada"));
    if (agent.detail) card.append(node("p", "agent-detail", agent.detail));
    elements["agents-grid"].append(card);
  }
}

function renderActivities(project) {
  clear(elements["activity-list"]);
  let activities = project.activities;
  if (state.activityFilter === "agents") {
    activities = activities.filter((a) => a.agent !== "Eu");
  } else if (state.activityFilter === "manual") {
    activities = activities.filter((a) => a.agent === "Eu");
  }
  if (!activities.length) {
    elements["activity-list"].append(node("li", "agent-empty", "Nenhuma atividade encontrada."));
    return;
  }
  let lastGroup = "";
  for (const activity of activities) {
    const group = dateGroup(activity.timestamp);
    if (group !== lastGroup) {
      const header = node("li", "timeline-date", group);
      elements["activity-list"].append(header);
      lastGroup = group;
    }
    const item = node("li", "timeline-item");
    const dot = node("span", `timeline-dot ${activity.status}`);
    dot.setAttribute("aria-hidden", "true");
    const copy = node("div", "timeline-copy");
    const meta = node("div", "timeline-meta");
    meta.append(node("span", "", activity.agent), node("time", "tabular", relativeTime(activity.timestamp)));
    copy.append(meta, node("strong", "", activity.action));
    if (activity.detail) copy.append(node("p", "", activity.detail));
    item.append(dot, copy);
    elements["activity-list"].append(item);
  }
}

function renderFiles(project) {
  clear(elements["file-list"]);
  if (!project.recentFiles.length) {
    elements["file-list"].append(node("li", "agent-empty", "Nenhum arquivo recente encontrado."));
    return;
  }
  const newFiles = detectNewFiles(project);
  let totalSize = 0;
  for (const file of project.recentFiles) {
    const item = node("li", "file-item");
    if (newFiles.has(file.path)) {
      item.classList.add("flash");
      setTimeout(() => item.classList.remove("flash"), 2000);
    }
    const code = node("code", "", file.path);
    code.title = file.path;
    const meta = node("div", "file-meta");
    meta.append(node("time", "tabular", relativeTime(file.updatedAt)));
    if (file.size) {
      meta.append(node("span", "file-size", formatFileSize(file.size)));
      totalSize += file.size;
    }
    item.append(code, meta);
    elements["file-list"].append(item);
  }
  elements["metric-files-size"].textContent = totalSize > 0 ? `${formatFileSize(totalSize)} total` : "Monitorados";
}

function renderProject(project) {
  const health = calculateHealth(project);
  const healthScore = elements["metric-health"];
  healthScore.textContent = `${health.score}% — ${healthLabel(health.score)}`;
  healthScore.className = `tabular health-${healthColor(health.score)}`;
  const healthBar = elements["health-bar"];
  healthBar.querySelector("span").style.width = `${health.score}%`;
  healthBar.querySelector("span").className = `health-fill health-${healthColor(health.score)}`;
  const breakdown = elements["health-breakdown"];
  clear(breakdown);
  for (const factor of health.factors) {
    const li = node("li", "health-factor");
    const bar = node("span", "health-factor-bar");
    const fill = node("span", `health-fill health-${factor.value < 0 ? "critical" : factor.value >= factor.max * 0.7 ? "excellent" : factor.value >= factor.max * 0.4 ? "good" : "warning"}`);
    fill.style.width = `${factor.max > 0 ? Math.max(0, Math.min(100, (factor.value / factor.max) * 100)) : 0}%`;
    bar.append(fill);
    const text = node("span", "health-factor-text");
    text.append(node("span", "health-factor-label", factor.label), node("span", "health-factor-hint", factor.hint));
    li.append(bar, text);
    breakdown.append(li);
  }
  elements["project-type"].textContent = TYPE_LABELS[project.type] || project.type.toUpperCase();
  elements["project-name"].textContent = project.name;
  elements["project-objective"].textContent = project.objective || "Objetivo ainda não documentado.";
  elements["metric-progress"].textContent = `${project.progress}%`;
  elements["project-progress"].value = project.progress;
  elements["project-progress"].textContent = `${project.progress}%`;
  elements["metric-agents"].textContent = String(project.activeAgentCount);
  elements["metric-agents-note"].textContent = project.blockedAgentCount ? `${project.blockedAgentCount} bloqueado(s)` : project.activeAgentCount ? "Atividade em andamento" : "Nenhum agente ativo";
  elements["metric-files"].textContent = String(project.recentFiles.length);
  elements["metric-updated"].textContent = relativeTime(project.updatedAt);
  elements["brief-objective"].textContent = project.objective || "Não informado";
  elements["brief-success"].textContent = project.success || "Não informado";
  elements["brief-essentials"].textContent = project.essentials || "Não informado";
  elements["brief-constraints"].textContent = project.constraints || "Não informado";
  elements["project-prompt"].value = project.suggestedPrompt;
  elements["copy-prompt-button"].disabled = false;
  renderAgents(project);
  renderActivities(project);
  renderFiles(project);
}

function render() {
  const projects = state.dashboard?.projects || [];
  if (projects.length && !projects.some((project) => project.id === state.selectedId)) state.selectedId = projects[0].id;
  renderProjects(projects);
  const project = selectedProject();
  elements["empty-state"].hidden = Boolean(project);
  elements["dashboard-content"].hidden = !project;
  if (!project) {
    elements["project-type"].textContent = "CENTRAL LOCAL";
    elements["project-name"].textContent = "Visão dos projetos";
    elements["project-objective"].textContent = "Crie um projeto para acompanhar agentes, mudanças e decisões em tempo real.";
    elements["copy-prompt-button"].disabled = true;
    return;
  }
  renderProject(project);
}

async function copyPrompt() {
  const project = selectedProject();
  if (!project) return;
  try {
    await navigator.clipboard.writeText(project.suggestedPrompt);
    showToast("Prompt copiado. Agora é só colar na conversa com a IA.");
  } catch {
    elements["project-prompt"].focus();
    elements["project-prompt"].select();
    showToast("Prompt selecionado para copiar.");
  }
}

async function copyProjectPath() {
  const project = selectedProject();
  if (!project) return;
  try {
    await navigator.clipboard.writeText(project.path);
    showToast("Caminho copiado para a área de transferência.");
  } catch {
    showToast("Não foi possível copiar o caminho.");
  }
}

function openInEditor() {
  const project = selectedProject();
  if (!project) return;
  window.open(`vscode://file/${project.path}`, "_blank");
  showToast("Abrindo no VS Code...");
}

function openInExplorer() {
  const project = selectedProject();
  if (!project) return;
  window.open(`file:///${project.path}`, "_blank");
  showToast("Abrindo pasta no explorador...");
}

async function fetchState() {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar o painel");
  state.dashboard = await response.json();
  render();
}

function connectEvents() {
  const events = new EventSource("/api/events");
  events.addEventListener("state", (event) => {
    state.dashboard = JSON.parse(event.data);
    updateConnection(true);
    render();
  });
  events.onerror = () => updateConnection(false);
}

elements["project-search"].addEventListener("input", (event) => {
  state.searchQuery = event.target.value;
  renderProjects(state.dashboard?.projects || []);
});

document.querySelectorAll(".filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    state.activityFilter = pill.dataset.filter;
    renderActivities(selectedProject());
  });
});

elements["refresh-button"].addEventListener("click", () => fetchState().then(() => showToast("Painel atualizado.")).catch((error) => showToast(error.message)));
elements["copy-prompt-button"].addEventListener("click", copyPrompt);
elements["copy-prompt-inline"].addEventListener("click", copyPrompt);
elements["action-copy-prompt"].addEventListener("click", copyPrompt);
elements["action-open-code"].addEventListener("click", openInEditor);
elements["action-open-folder"].addEventListener("click", openInExplorer);
elements["action-copy-path"].addEventListener("click", copyProjectPath);

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "k") {
    event.preventDefault();
    elements["project-search"].focus();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "r" && !event.shiftKey) {
    event.preventDefault();
    fetchState().then(() => showToast("Painel atualizado.")).catch((error) => showToast(error.message));
  }
  if (event.key === "Escape") {
    elements["project-search"].blur();
    elements["project-search"].value = "";
    state.searchQuery = "";
    renderProjects(state.dashboard?.projects || []);
  }
});

elements["activity-form"].addEventListener("submit", async (event) => {
  event.preventDefault();
  const project = selectedProject();
  if (!project) return;
  elements["form-message"].textContent = "Registrando…";
  try {
    const response = await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Supermotor-Request": "dashboard" },
      body: JSON.stringify({
        projectId: project.id,
        agent: elements["activity-agent"].value,
        status: elements["activity-status"].value,
        action: elements["activity-action"].value,
        detail: elements["activity-detail"].value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível registrar");
    state.dashboard = result.state;
    elements["activity-action"].value = "";
    elements["activity-detail"].value = "";
    elements["form-message"].textContent = "";
    render();
    showToast("Atualização registrada no projeto.");
  } catch (error) {
    elements["form-message"].textContent = error.message;
  }
});

document.querySelectorAll(".status-pick").forEach((pick) => {
  pick.addEventListener("click", () => {
    document.querySelectorAll(".status-pick").forEach((p) => p.classList.remove("active"));
    pick.classList.add("active");
    elements["activity-status"].value = pick.dataset.status;
  });
});

const previousFileHashes = new Map();
function detectNewFiles(project) {
  if (!project) return new Set();
  const currentHash = project.recentFiles.map((f) => f.path).join("|");
  const prev = previousFileHashes.get(project.id) || "";
  const newFiles = new Set();
  if (prev && prev !== currentHash) {
    const prevFiles = new Set(prev.split("|"));
    for (const file of project.recentFiles) {
      if (!prevFiles.has(file.path)) newFiles.add(file.path);
    }
  }
  previousFileHashes.set(project.id, currentHash);
  return newFiles;
}

fetchState().then(() => updateConnection(true)).catch((error) => {
  updateConnection(false);
  showToast(error.message);
});
connectEvents();
setInterval(() => {
  if (state.dashboard) render();
}, 30_000);
