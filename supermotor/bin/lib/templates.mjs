import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./constants.mjs";
import { ui, spinner, formatDuration } from "./ui.mjs";

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
  ui.debug(`Executando npm install em: ${directory}`);
  const spin = spinner("Instalando dependencias...");
  const start = performance.now();
  spin.start();
  const result = runNpm(["install", "--no-audit", "--no-fund"], {
    cwd: directory,
    stdio: "ignore",
  });
  const duration = performance.now() - start;

  if (result.status !== 0) {
    spin.fail(`Instalacao falhou apos ${formatDuration(duration)}`);
    ui.hint("Rode manualmente: cd \"" + directory + "\" && npm install");
    return false;
  }

  spin.succeed(`Dependencias instaladas (${formatDuration(duration)})`);
  return true;
}

export { copyTemplate, commandExists, runNpm, runYarn, runGit, npmInstall };
