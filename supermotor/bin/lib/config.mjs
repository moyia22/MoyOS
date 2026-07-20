import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "supermotor");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
  port: 4545,
  language: "pt-br",
  theme: "dark",
  autoOpenDashboard: true,
  defaultOutputDir: "",
  brand: {
    accent: "#ff5a1f",
    tone: "profissional e acessivel",
  },
};

function getConfigPath() {
  return CONFIG_FILE;
}

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed, brand: { ...DEFAULT_CONFIG.brand, ...(parsed.brand || {}) } };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

function updateConfig(patch) {
  const current = loadConfig();
  const updated = { ...current, ...patch };
  if (patch.brand) updated.brand = { ...current.brand, ...patch.brand };
  saveConfig(updated);
  return updated;
}

function resetConfig() {
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

export { loadConfig, saveConfig, updateConfig, resetConfig, getConfigPath, DEFAULT_CONFIG };
