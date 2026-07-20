import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./constants.mjs";
import { ui } from "./ui.mjs";

function copyTemplate(source, destination) {
  cpSync(source, destination, { recursive: true, force: true });
}

function commandExists(command) {
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", [command], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function runNpm(args, options = {}) {
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm", ...args], options);
  }
  return spawnSync("npm", args, options);
}

function runYarn(args, options = {}) {
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "yarn", ...args], options);
  }
  return spawnSync("yarn", args, options);
}

function runGit(args, options = {}) {
  return spawnSync("git", args, options);
}

function npmInstall(directory) {
  ui.info("Instalando depend\u00eancias...");
  const result = runNpm(["install", "--no-audit", "--no-fund"], {
    cwd: directory,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    ui.warn("A instala\u00e7\u00e3o falhou, mas o projeto foi preservado. Rode npm install dentro dele.");
    return false;
  }

  ui.ok("Depend\u00eancias instaladas");
  return true;
}

export { copyTemplate, commandExists, runNpm, runYarn, runGit, npmInstall };
