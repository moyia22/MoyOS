import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLI = resolve(ROOT, "bin", "supermotor.mjs");
const TEST_OUTPUT = resolve(ROOT, ".test-output-integration");

if (!existsSync(TEST_OUTPUT)) mkdirSync(TEST_OUTPUT, { recursive: true });

function safeRmDir(dir) {
  if (!existsSync(dir)) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { rmSync(dir, { recursive: true, force: true }); return; } catch { /* Windows lock */ }
  }
}

function run(args = [], options = {}) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd: options.cwd || ROOT,
      encoding: "utf8",
      timeout: 20000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status || 1 };
  }
}

describe("CLI version flag", () => {
  it("--version prints version", () => {
    const { stdout, exitCode } = run(["--version"]);
    assert.equal(exitCode, 0);
    assert.match(stdout.trim(), /^supermotor \d+\.\d+\.\d+$/);
  });

  it("version alias works", () => {
    const { stdout, exitCode } = run(["version"]);
    assert.equal(exitCode, 0);
    assert.match(stdout.trim(), /^supermotor \d+\.\d+\.\d+$/);
  });
});

describe("CLI help flag", () => {
  it("--help prints usage", () => {
    const { stdout, exitCode } = run(["--help"]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Uso:/);
    assert.match(stdout, /supermotor/);
  });

  it("help alias works", () => {
    const { stdout, exitCode } = run(["help"]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Uso:/);
  });
});

describe("CLI unknown command", () => {
  it("returns error for unknown command", () => {
    const { stdout, stderr, exitCode } = run(["comando-inexistente"]);
    assert.notEqual(exitCode, 0);
    const combined = (stdout + stderr);
    assert.match(combined, /Comando desconhecido/);
  });
});

describe("CLI project creation", () => {
  it("creates a site project with --rapido", () => {
    const projectDir = join(TEST_OUTPUT, "test-site");
    safeRmDir(projectDir);

    const { stdout, exitCode } = run(["criar", "site", "Teste Site", "--rapido", "--saida", projectDir, "--sem-instalar", "--sem-build"]);
    assert.equal(exitCode, 0, `Expected exit 0. Output: ${stdout}`);

    assert.ok(existsSync(join(projectDir, "package.json")), "package.json should exist");
    assert.ok(existsSync(join(projectDir, "src", "app", "page.tsx")), "page.tsx should exist");
    assert.ok(existsSync(join(projectDir, "BRAND.md")), "BRAND.md should exist");
    assert.ok(existsSync(join(projectDir, ".supermotor", "project.json")), "project.json should exist");

    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
    assert.equal(pkg.name, "teste-site");

    safeRmDir(projectDir);
  });

  it("creates an app project with --rapido", () => {
    const projectDir = join(TEST_OUTPUT, "test-app");
    safeRmDir(projectDir);

    const { stdout, exitCode } = run(["criar", "app", "Teste App", "--rapido", "--saida", projectDir, "--sem-instalar", "--sem-build"]);
    assert.equal(exitCode, 0, `Expected exit 0. Output: ${stdout}`);

    assert.ok(existsSync(join(projectDir, "package.json")), "package.json should exist");
    assert.ok(existsSync(join(projectDir, ".supermotor", "project.json")), "project.json should exist");

    safeRmDir(projectDir);
  });

  it("creates a carousel project with --rapido", () => {
    const projectDir = join(TEST_OUTPUT, "test-carousel");
    safeRmDir(projectDir);

    const { stdout, exitCode } = run(["criar", "carrossel", "Teste Carousel", "--rapido", "--saida", projectDir, "--sem-instalar", "--sem-build"]);
    assert.equal(exitCode, 0, `Expected exit 0. Output: ${stdout}`);

    assert.ok(existsSync(join(projectDir, "package.json")), "package.json should exist");

    safeRmDir(projectDir);
  });

  it("creates a landing project with --rapido", () => {
    const projectDir = join(TEST_OUTPUT, "test-landing");
    safeRmDir(projectDir);

    const { stdout, exitCode } = run(["criar", "landing", "Teste Landing", "--rapido", "--saida", projectDir, "--sem-instalar", "--sem-build"]);
    assert.equal(exitCode, 0, `Expected exit 0. Output: ${stdout}`);

    assert.ok(existsSync(join(projectDir, "package.json")), "package.json should exist");
    assert.ok(existsSync(join(projectDir, "src", "app", "page.tsx")), "page.tsx should exist");

    safeRmDir(projectDir);
  });
});

describe("CLI validation", () => {
  it("validates a created project", () => {
    const projectDir = join(TEST_OUTPUT, "test-validate");
    safeRmDir(projectDir);

    run(["criar", "site", "Teste Validar", "--rapido", "--saida", projectDir, "--sem-instalar", "--sem-build"]);

    const { stdout, exitCode } = run(["validar", projectDir, "--sem-build"]);
    assert.equal(exitCode, 0, `Validation should pass. Output: ${stdout}`);

    safeRmDir(projectDir);
  });

  it("fails for non-existent project", () => {
    const { exitCode } = run(["validar", join(TEST_OUTPUT, "nao-existe")]);
    assert.notEqual(exitCode, 0);
  });
});

describe("CLI state commands", () => {
  it("listar works on empty state", () => {
    const { exitCode } = run(["listar"]);
    assert.equal(exitCode, 0);
  });

  it("listar --json outputs valid JSON", () => {
    const { stdout, exitCode } = run(["listar", "--json"]);
    assert.equal(exitCode, 0);
    const trimmed = stdout.trim();
    assert.ok(trimmed.startsWith("[") || trimmed.startsWith("{"), `Expected JSON output, got: ${trimmed.substring(0, 80)}`);
    assert.doesNotThrow(() => JSON.parse(trimmed));
  });
});

describe("CLI doctor", () => {
  it("doctor runs without error", () => {
    const { exitCode } = run(["doctor"]);
    assert.equal(exitCode, 0);
  });
});

describe("CLI verbose mode", () => {
  it("--verbose flag is accepted", () => {
    const { exitCode } = run(["listar", "--verbose"]);
    assert.equal(exitCode, 0);
  });
});

describe("Token replacement integrity", () => {
  it("no __TOKEN__ leftovers in created project", async () => {
    const projectDir = join(TEST_OUTPUT, "test-tokens");
    safeRmDir(projectDir);

    run(["criar", "site", "Token Test", "--rapido", "--saida", projectDir, "--sem-instalar", "--sem-build"]);

    const { collectFiles } = await import(pathToFileURL(resolve(ROOT, "bin", "lib", "tokens.mjs")).href);
    const srcDir = join(projectDir, "src");
    const files = existsSync(srcDir) ? collectFiles(srcDir) : [];
    const textFiles = files.filter((f) => /\.(css|html|js|jsx|ts|tsx|md|json)$/i.test(f));

    for (const file of textFiles) {
      const content = readFileSync(file, "utf8");
      const match = content.match(/__(PROJECT|BRAND|FAVICON)_[A-Z_]+__/);
      assert.ok(!match, `Unreplaced token found in ${file}: ${match?.[0]}`);
    }

    assert.ok(textFiles.length > 0, "Should have checked at least one file");

    safeRmDir(projectDir);
  });
});
