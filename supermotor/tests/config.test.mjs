import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, saveConfig, updateConfig, resetConfig, get, set, getAll, DEFAULT_CONFIG } from "../bin/lib/config.mjs";

const CONFIG_DIR = join(tmpdir(), `sm-test-config-${Date.now()}`);
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

describe("DEFAULT_CONFIG", () => {
  it("has required structure", () => {
    assert.ok(DEFAULT_CONFIG.dashboard);
    assert.ok(DEFAULT_CONFIG.brand);
    assert.ok(DEFAULT_CONFIG.project);
    assert.equal(typeof DEFAULT_CONFIG.dashboard.port, "number");
    assert.equal(typeof DEFAULT_CONFIG.dashboard.openBrowser, "boolean");
    assert.equal(typeof DEFAULT_CONFIG.brand.accent, "string");
    assert.equal(typeof DEFAULT_CONFIG.language, "string");
  });
});

describe("loadConfig", () => {
  it("returns defaults when no config exists", () => {
    const config = loadConfig();
    assert.equal(config.dashboard.port, 4545);
    assert.equal(config.dashboard.openBrowser, true);
    assert.equal(config.brand.accent, "#ff5a1f");
  });

  it("merges with defaults", () => {
    const config = loadConfig();
    assert.ok(config.project);
    assert.ok(config.dashboard);
  });
});

describe("get/set", () => {
  it("gets nested values", () => {
    const val = get("dashboard.port");
    assert.equal(typeof val, "number");
  });

  it("returns undefined for missing keys", () => {
    const val = get("nonexistent.nested.key");
    assert.equal(val, undefined);
  });

  it("sets nested values", () => {
    set("dashboard.port", "3000");
    const val = get("dashboard.port");
    assert.equal(val, 3000);
    set("dashboard.port", "4545");
  });

  it("sets boolean values", () => {
    set("dashboard.openBrowser", "false");
    const val = get("dashboard.openBrowser");
    assert.equal(val, false);
    set("dashboard.openBrowser", "true");
  });

  it("sets string values", () => {
    set("brand.tone", "test-tone");
    const val = get("brand.tone");
    assert.equal(val, "test-tone");
  });
});

describe("getAll", () => {
  it("returns full config object", () => {
    const config = getAll();
    assert.ok(config.dashboard);
    assert.ok(config.brand);
    assert.ok(config.project);
    assert.ok(config.language);
  });
});

describe("resetConfig", () => {
  it("resets to defaults", () => {
    set("brand.tone", "custom-tone");
    const before = get("brand.tone");
    assert.equal(before, "custom-tone");
    resetConfig();
    const after = get("brand.tone");
    assert.equal(after, "profissional e acessivel");
  });
});
