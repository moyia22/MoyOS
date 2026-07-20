import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "supermotor");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
  dashboard: {
    port: 4545,
    openBrowser: true,
  },
  brand: {
    accent: "#ff5a1f",
    tone: "profissional e acessivel",
    audience: "",
  },
  project: {
    outputDir: "",
    skipInstall: false,
    skipBuild: false,
  },
  language: "pt-br",
  theme: "dark",
};

function getConfigPath() {
  return CONFIG_FILE;
}

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_CONFIG),
      ...parsed,
      dashboard: { ...DEFAULT_CONFIG.dashboard, ...(parsed.dashboard || {}) },
      brand: { ...DEFAULT_CONFIG.brand, ...(parsed.brand || {}) },
      project: { ...DEFAULT_CONFIG.project, ...(parsed.project || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

function updateConfig(patch) {
  const current = loadConfig();
  const updated = { ...current, ...patch };
  if (patch.dashboard) updated.dashboard = { ...current.dashboard, ...patch.dashboard };
  if (patch.brand) updated.brand = { ...current.brand, ...patch.brand };
  if (patch.project) updated.project = { ...current.project, ...patch.project };
  saveConfig(updated);
  return updated;
}

function resetConfig() {
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

function get(key) {
  const config = loadConfig();
  const keys = key.split(".");
  let value = config;
  for (const k of keys) {
    if (value && typeof value === "object") value = value[k];
    else return undefined;
  }
  return value;
}

function set(key, value) {
  const patch = {};
  const keys = key.split(".");
  let obj = patch;
  for (let i = 0; i < keys.length - 1; i++) {
    obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value === "true" ? true : value === "false" ? false : isNaN(value) ? value : Number(value);
  return updateConfig(patch);
}

function getAll() {
  return loadConfig();
}

export { loadConfig, saveConfig, updateConfig, resetConfig, getConfigPath, get, set, getAll, DEFAULT_CONFIG };
