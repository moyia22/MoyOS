import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, TYPES } from "./constants.mjs";

const PLUGINS_DIR = join(ROOT, "plugins");
const customTypes = new Map();

function loadPlugins() {
  if (!existsSync(PLUGINS_DIR)) return;
  try {
    const entries = readdirSync(PLUGINS_DIR);
    for (const entry of entries) {
      const pluginPath = join(PLUGINS_DIR, entry);
      try {
        const manifestPath = join(pluginPath, "plugin.json");
        if (!existsSync(manifestPath)) continue;
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        if (!manifest.name || !manifest.type) continue;
        const typeKey = manifest.type.toLowerCase();
        customTypes.set(typeKey, {
          key: typeKey,
          label: manifest.label || manifest.name,
          template: manifest.template || entry,
          description: manifest.description || "",
          version: manifest.version || "1.0.0",
          author: manifest.author || "",
          pluginPath,
          templatePath: manifest.template ? join(ROOT, "templates", manifest.template) : pluginPath,
        });
      } catch {
        // Skip malformed plugins
      }
    }
  } catch {
    // Plugins directory not readable
  }
}

function getCustomTypes() {
  return Object.fromEntries(customTypes);
}

function hasCustomType(type) {
  return customTypes.has(type.toLowerCase());
}

function getCustomType(type) {
  return customTypes.get(type.toLowerCase()) || null;
}

function getAllTypes() {
  const all = { ...TYPES };
  for (const [key, plugin] of customTypes) {
    all[key] = {
      key,
      label: plugin.label,
      template: plugin.template,
      description: plugin.description,
      plugin: true,
    };
  }
  return all;
}

function listPlugins() {
  const plugins = [];
  for (const [key, plugin] of customTypes) {
    plugins.push({
      name: plugin.label,
      type: key,
      version: plugin.version,
      author: plugin.author,
      description: plugin.description,
    });
  }
  return plugins;
}

export { loadPlugins, getCustomTypes, hasCustomType, getCustomType, getAllTypes, listPlugins };
