import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMP_ROOT = join(ROOT, ".supermotor-tmp", "smoke");
const CLI = join(ROOT, "bin", "supermotor.mjs");
const TEST_ENV = { ...process.env, SUPERMOTOR_STATE_ROOT: join(TEMP_ROOT, "motor-state"), SUPERMOTOR_PROJECTS_ROOT: join(TEMP_ROOT, "projects-root") };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeClean(path) {
  const resolvedPath = resolve(path);
  const safeBase = resolve(ROOT, ".supermotor-tmp");
  assert(resolvedPath.startsWith(`${safeBase}\\`) || resolvedPath.startsWith(`${safeBase}/`), "Limpeza fora da área segura bloqueada");
  if (existsSync(resolvedPath)) rmSync(resolvedPath, { recursive: true, force: true });
}

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

safeClean(TEMP_ROOT);
mkdirSync(TEMP_ROOT, { recursive: true });

for (const file of ["AUTOMATION.md", "CLAUDE.md", "bootstrap.ps1", "bootstrap.sh", ".cursor/rules/auto-bootstrap.mdc"]) {
  assert(existsSync(join(ROOT, file)), `Automação após clone ausente: ${file}`);
}

const crmFixture = join(TEMP_ROOT, "wacrm-source");
mkdirSync(join(crmFixture, "src", "app"), { recursive: true });
mkdirSync(join(crmFixture, "supabase", "migrations"), { recursive: true });
mkdirSync(join(crmFixture, "public"), { recursive: true });
writeFileSync(join(crmFixture, "package.json"), `${JSON.stringify({ name: "crm", private: true }, null, 2)}\n`);
writeFileSync(join(crmFixture, "AGENTS.md"), "# wacrm fixture\n");
writeFileSync(join(crmFixture, "LICENSE"), "MIT\n");
writeFileSync(join(crmFixture, "next.config.ts"), "const config = {};\nexport default config;\n");
writeFileSync(join(crmFixture, "src", "app", "layout.tsx"), 'export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }\n');
writeFileSync(join(crmFixture, "src", "app", "globals.css"), "body { margin: 0; }\n");
writeFileSync(join(crmFixture, "src", "app", "page.tsx"), "export default function Home() { return <h1>wacrm</h1>; }\n");
execFileSync("git", ["init", "-b", "main"], { cwd: crmFixture, stdio: "pipe" });
execFileSync("git", ["config", "user.email", "smoke@supermotor.local"], { cwd: crmFixture, stdio: "pipe" });
execFileSync("git", ["config", "user.name", "SUPERMOTOR Smoke"], { cwd: crmFixture, stdio: "pipe" });
execFileSync("git", ["add", "."], { cwd: crmFixture, stdio: "pipe" });
execFileSync("git", ["commit", "-m", "test: wacrm fixture"], { cwd: crmFixture, stdio: "pipe" });

const cases = [
  ["site", "Site Teste", "site-teste"],
  ["app", "App Teste", "app-teste"],
  ["carrossel", "Carrossel Teste", "carrossel-teste"],
];

try {
  for (const [type, name, slug] of cases) {
    const output = join(TEMP_ROOT, slug);
    const createArgs = [CLI, "criar", type, name, "--saida", output, "--sem-instalar"];
    if (type === "site") {
      createArgs.push(
        "--marca", "Marca Teste",
        "--publico", "Empreendedores digitais",
        "--tom", "direta e confiante",
        "--cor", "#1d4ed8",
        "--favicon", join(ROOT, "tests", "fixtures", "favicon.svg"),
      );
    }
    execFileSync(process.execPath, createArgs, {
      cwd: ROOT,
      stdio: "pipe",
      env: TEST_ENV,
    });

    for (const file of ["package.json", "PRODUCT.md", "CONVERSATION.md", "BRAND.md", "DESIGN.md", "QUALITY.md", "SUPERPROMPT.md", "AGENTS.md", ".supermotor/project.json", ".supermotor/agent.mjs", ".supermotor/AGENT_PROTOCOL.md", "src/app/page.tsx", "src/app/icon.svg"]) {
      assert(existsSync(join(output, file)), `${type}: arquivo ausente ${file}`);
    }

    const packageJson = JSON.parse(readFileSync(join(output, "package.json"), "utf8"));
    assert(packageJson.name === slug, `${type}: nome do pacote incorreto`);

    const prompt = readFileSync(join(output, "SUPERPROMPT.md"), "utf8");
    assert(prompt.includes(name), `${type}: nome ausente no prompt`);

    const tokenLeaks = filesUnder(output).filter((file) => /__(PROJECT|BRAND|FAVICON)_/.test(readFileSync(file, "utf8")));
    assert(tokenLeaks.length === 0, `${type}: tokens não substituídos em ${tokenLeaks.join(", ")}`);

    execFileSync(process.execPath, [CLI, "validar", output, "--sem-build"], { cwd: ROOT, stdio: "pipe", env: TEST_ENV });
  }

  const trackedSite = join(TEMP_ROOT, "site-teste");
  execFileSync(process.execPath, [join(trackedSite, ".supermotor", "agent.mjs"), "start", "--agent", "Codex", "--action", "Implementando o fluxo principal"], { cwd: trackedSite, stdio: "pipe" });
  const trackedActivity = readFileSync(join(trackedSite, ".supermotor", "activity.jsonl"), "utf8");
  assert(trackedActivity.includes("Implementando o fluxo principal"), "Protocolo do agente não registrou atividade");

  const crmOutput = join(TEMP_ROOT, "crm-comercial");
  execFileSync(
    process.execPath,
    [CLI, "criar", "crm", "CRM Comercial", "--saida", crmOutput, "--crm-repo", crmFixture, "--crm-ref", "main", "--sem-instalar"],
    { cwd: ROOT, stdio: "pipe", env: TEST_ENV },
  );
  for (const file of [
    "AGENTS.md",
    "SUPERMOTOR.md",
    ".supermotor/project.json",
    ".supermotor/PRODUCT.md",
    ".supermotor/CONVERSATION.md",
    ".supermotor/BRAND.md",
    ".supermotor/QUALITY.md",
    ".supermotor/SUPERPROMPT.md",
    ".supermotor/agent.mjs",
    ".supermotor/AGENT_PROTOCOL.md",
    "public/supermotor-icon.svg",
  ]) {
    assert(existsSync(join(crmOutput, file)), `crm: arquivo ausente ${file}`);
  }
  const crmMetadata = JSON.parse(readFileSync(join(crmOutput, ".supermotor", "project.json"), "utf8"));
  assert(crmMetadata.projectType === "crm" && crmMetadata.sourceRef === "main", "crm: origem estável não registrada");
  const crmCss = readFileSync(join(crmOutput, "src", "app", "globals.css"), "utf8");
  assert(crmCss.includes("supermotor-mobile-guards") && crmCss.includes("font-size: 16px !important"), "crm: proteções mobile ausentes");
  execFileSync(process.execPath, [CLI, "validar", crmOutput, "--sem-build"], { cwd: ROOT, stdio: "pipe", env: TEST_ENV });

  const interactiveOutput = join(TEMP_ROOT, "interativo");
  const interactive = spawnSync(
    process.execPath,
    [CLI, "--saida", interactiveOutput, "--sem-instalar"],
    { cwd: ROOT, input: "1\nProjeto Interativo\nValidar o assistente guiado\n", encoding: "utf8", env: TEST_ENV },
  );
  assert(interactive.status === 0, `Assistente interativo falhou: ${interactive.stderr}`);
  assert(existsSync(join(interactiveOutput, "src", "app", "page.tsx")), "Assistente não criou o site");
  assert(existsSync(join(interactiveOutput, "src", "app", "icon.svg")), "Assistente não gerou favicon automático");

  const invalidOutput = join(TEMP_ROOT, "favicon-invalido");
  const invalid = spawnSync(process.execPath, [CLI, "criar", "site", "Favicon Inválido", "--saida", invalidOutput, "--favicon", "arquivo-inexistente.png", "--sem-instalar"], { cwd: ROOT, encoding: "utf8", env: TEST_ENV });
  assert(invalid.status !== 0, "Favicon inexistente deveria reprovar a criação");
  assert(!existsSync(invalidOutput), "Projeto parcial foi deixado após favicon inválido");

  const existingOutput = join(TEMP_ROOT, "projeto-existente");
  mkdirSync(existingOutput, { recursive: true });
  writeFileSync(join(existingOutput, "package.json"), `${JSON.stringify({ name: "projeto-existente" }, null, 2)}\n`);
  execFileSync(process.execPath, [CLI, "registrar", existingOutput, "--nome", "Projeto Existente"], { cwd: ROOT, stdio: "pipe", env: TEST_ENV });
  assert(existsSync(join(existingOutput, ".supermotor", "project.json")), "Registro de projeto existente não criou metadados");
  assert(existsSync(join(existingOutput, ".supermotor", "agent.mjs")), "Registro de projeto existente não instalou protocolo de agentes");

  const help = execFileSync(process.execPath, [CLI, "--help"], { cwd: ROOT, encoding: "utf8", env: TEST_ENV });
  assert(help.includes("SUPERMOTOR 3.0") && help.includes("supermotor painel"), "Atalho --help não exibiu o painel");

  execFileSync(process.execPath, [CLI, "doctor"], { cwd: ROOT, stdio: "pipe", env: TEST_ENV });
  console.log("✓ Smoke test: bootstrap, conversa, agentes, Brand Kit, mobile, wacrm e quatro starters aprovados");
} finally {
  safeClean(TEMP_ROOT);
}
