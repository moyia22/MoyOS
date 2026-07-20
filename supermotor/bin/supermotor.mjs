#!/usr/bin/env node

import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { appendActivity, initializeProjectTracking, STATE_ROOT } from "./supermotor-state.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = join(ROOT, "templates");
const DEFAULT_OUTPUT = join(ROOT, "projetos");
const WACRM_REPOSITORY = "https://github.com/ArnasDon/wacrm.git";
const WACRM_STABLE_REF = "main";
const DEFAULT_BRAND = {
  audience: "Pessoas que valorizam clareza, qualidade e resultado.",
  tone: "ousada, humana e orientada a resultado",
  accent: "#ff5a1f",
};
const ICON_EXTENSIONS = new Set([".ico", ".jpg", ".jpeg", ".png", ".svg"]);

const TYPES = {
  site: {
    aliases: ["site", "landing", "landing-page", "website"],
    label: "Site premium",
    template: "site",
    description: "site de marketing, institucional, portfólio ou landing page",
  },
  app: {
    aliases: ["app", "aplicacao", "aplicação", "dashboard", "sistema"],
    label: "Aplicação",
    template: "application",
    description: "produto digital, SaaS, dashboard ou sistema web",
  },
  carousel: {
    aliases: ["carousel", "carrossel", "carrosséis", "carrosseis", "social"],
    label: "Estúdio de carrossel",
    template: "carousel",
    description: "carrossel para Instagram ou LinkedIn com editor e exportação",
  },
  crm: {
    aliases: ["crm", "wacrm", "vendas", "clientes", "relacionamento", "funil", "pipeline", "sales", "whatsapp-crm", "gestao-de-clientes", "gestão-de-clientes"],
    label: "CRM com WhatsApp",
    template: "crm",
    description: "CRM completo com WhatsApp integrado — inbox compartilhado, contatos, pipeline Kanban, broadcasts e automações no-code",
    external: true,
  },
};

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdc",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

function color(code, text) {
  return process.stdout.isTTY ? `\u001b[${code}m${text}\u001b[0m` : text;
}

const ui = {
  title: (text) => console.log(`\n${color("1;38;5;208", text)}\n`),
  info: (text) => console.log(`${color("36", "▶")} ${text}`),
  ok: (text) => console.log(`${color("32", "✓")} ${text}`),
  warn: (text) => console.log(`${color("33", "!")} ${text}`),
  fail: (text) => console.error(`${color("31", "✕")} ${text}`),
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

    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[rawKey] = next;
      index += 1;
    } else {
      options[rawKey] = true;
    }
  }

  return { positionals, options };
}

function normalizeType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return Object.entries(TYPES).find(([, config]) => config.aliases.includes(normalized))?.[0];
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeHexColor(value) {
  const color = String(value || DEFAULT_BRAND.accent).trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(color)) {
    return `#${color.slice(1).split("").map((character) => character.repeat(2)).join("")}`;
  }
  if (/^#[0-9a-f]{6}$/.test(color)) return color;
  throw new Error("A cor de destaque deve usar o formato hexadecimal, por exemplo #ff5a1f.");
}

function mixWithWhite(hex, ratio = 0.78) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const mixed = channels.map((channel) => Math.round(channel + (255 - channel) * ratio));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function readableTextColor(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.48 ? "#11110f" : "#ffffff";
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function brandInitials(brandName) {
  return brandName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "M";
}

function validateFaviconInput(faviconOption) {
  const option = String(faviconOption || "auto").trim().replace(/^['"]|['"]$/g, "");
  if (!option || ["auto", "automatico", "automático"].includes(option.toLowerCase())) return;

  const source = resolve(process.cwd(), option);
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`Favicon não encontrado: ${source}`);
  }
  if (!ICON_EXTENSIONS.has(extname(source).toLowerCase())) {
    throw new Error("Favicon inválido. Use .ico, .png, .jpg, .jpeg ou .svg.");
  }
}

function createFavicon(destination, faviconOption, brandName, accent) {
  const appDirectory = join(destination, "src", "app");
  const option = String(faviconOption || "auto").trim().replace(/^['"]|['"]$/g, "");

  if (option && !["auto", "automatico", "automático"].includes(option.toLowerCase())) {
    const source = resolve(process.cwd(), option);
    if (!existsSync(source) || !statSync(source).isFile()) {
      throw new Error(`Favicon não encontrado: ${source}`);
    }

    const extension = extname(source).toLowerCase();
    if (!ICON_EXTENSIONS.has(extension)) {
      throw new Error("Favicon inválido. Use .ico, .png, .jpg, .jpeg ou .svg.");
    }

    const fileName = extension === ".ico" ? "favicon.ico" : `icon${extension}`;
    copyFileSync(source, join(appDirectory, fileName));
    return `arquivo fornecido: ${source}`;
  }

  const initials = escapeXml(brandInitials(brandName));
  const foreground = readableTextColor(accent);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(brandName)}">
  <rect width="64" height="64" rx="18" fill="${accent}"/>
  <circle cx="50" cy="14" r="8" fill="${foreground}" opacity="0.16"/>
  <text x="32" y="39" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="${foreground}">${initials}</text>
</svg>
`;
  writeFileSync(join(appDirectory, "icon.svg"), svg, "utf8");
  return "monograma gerado automaticamente";
}

function faviconMimeType(extension) {
  return {
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  }[extension] || "image/png";
}

function patchWacrmCss(destination) {
  const guards = `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { overflow-x: clip; }
a, button, input, select, textarea { touch-action: manipulation; }
@media (max-width: 767px) {
  input:not([type="checkbox"]):not([type="radio"]), select, textarea { font-size: 16px !important; }
}`;
  const globalsPath = join(destination, "src", "app", "globals.css");
  if (existsSync(globalsPath)) {
    let css = readFileSync(globalsPath, "utf8");
    if (!css.includes("supermotor-mobile-guards")) {
      css = `/* supermotor-mobile-guards */\n${guards}\n\n${css}`;
      writeFileSync(globalsPath, css, "utf8");
    }
    return;
  }
  const publicDir = join(destination, "public");
  if (existsSync(publicDir)) {
    const guardPath = join(publicDir, "supermotor-mobile.css");
    if (!existsSync(guardPath)) {
      writeFileSync(guardPath, guards, "utf8");
    }
  }
}

function createCrmFavicon(destination, faviconOption, brandName, accent) {
  const publicDirectory = join(destination, "public");
  mkdirSync(publicDirectory, { recursive: true });
  const option = String(faviconOption || "auto").trim().replace(/^['"]|['"]$/g, "");
  let iconFileName;
  let sourceLabel;

  if (option && !["auto", "automatico", "automático"].includes(option.toLowerCase())) {
    const source = resolve(process.cwd(), option);
    const extension = extname(source).toLowerCase();
    iconFileName = `supermotor-icon${extension}`;
    copyFileSync(source, join(publicDirectory, iconFileName));
    sourceLabel = `arquivo fornecido: ${source}`;
  } else {
    iconFileName = "supermotor-icon.svg";
    const foreground = readableTextColor(accent);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(brandName)}">
  <rect width="64" height="64" rx="18" fill="${accent}"/>
  <circle cx="50" cy="14" r="8" fill="${foreground}" opacity="0.16"/>
  <text x="32" y="39" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="${foreground}">${escapeXml(brandInitials(brandName))}</text>
</svg>
`;
    writeFileSync(join(publicDirectory, iconFileName), svg, "utf8");
    sourceLabel = "monograma gerado automaticamente";
  }

  patchWacrmCss(destination);
  return sourceLabel;
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

function copyTemplate(source, destination) {
  cpSync(source, destination, { recursive: true, force: true });
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

function replaceTokens(directory, tokens) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      replaceTokens(fullPath, tokens);
      continue;
    }

    const extension = entry.includes(".") ? `.${entry.split(".").pop()}` : "";
    if (!TEXT_EXTENSIONS.has(extension) && !["AGENTS.md", ".gitignore"].includes(entry)) {
      continue;
    }

    let content = readFileSync(fullPath, "utf8");
    for (const [token, replacement] of Object.entries(tokens)) {
      content = content.replaceAll(`__${token}__`, replacement);
    }
    writeFileSync(fullPath, content, "utf8");
  }
}

function replaceTokensInFile(path, tokens) {
  let content = readFileSync(path, "utf8");
  for (const [token, replacement] of Object.entries(tokens)) {
    content = content.replaceAll(`__${token}__`, replacement);
  }
  writeFileSync(path, content, "utf8");
}

function npmInstall(directory) {
  ui.info("Instalando dependências...");
  const result = runNpm(["install", "--no-audit", "--no-fund"], {
    cwd: directory,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    ui.warn("A instalação falhou, mas o projeto foi preservado. Rode npm install dentro dele.");
    return false;
  }

  ui.ok("Dependências instaladas");
  return true;
}

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}

function projectTokens(type, answers, slug, extra = {}) {
  return {
    PROJECT_NAME: answers.name.trim(),
    PROJECT_SLUG: slug,
    PROJECT_TYPE: TYPES[type].label,
    PROJECT_DESCRIPTION: TYPES[type].description,
    PROJECT_BRIEF: answers.brief.trim(),
    PROJECT_SUCCESS: answers.success.trim(),
    PROJECT_ESSENTIALS: answers.essentials.trim(),
    PROJECT_CONSTRAINTS: answers.constraints.trim(),
    BRAND_NAME: answers.brandName.trim(),
    BRAND_AUDIENCE: answers.audience.trim(),
    BRAND_TONE: answers.tone.trim(),
    BRAND_ACCENT: answers.accent,
    BRAND_ACCENT_SOFT: mixWithWhite(answers.accent),
    BRAND_ACCENT_TEXT: readableTextColor(answers.accent),
    CREATED_DATE: new Date().toISOString().slice(0, 10),
    ...extra,
  };
}

async function promptForMissing(type, name, brief, options = {}) {
  if (!input.isTTY) {
    let piped = "";
    for await (const chunk of input) piped += chunk;
    const answers = piped.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const choice = type ? undefined : answers.shift();
    const resolvedType = type || { "1": "site", "2": "app", "3": "carousel", "4": "crm" }[choice] || normalizeType(choice);
    const resolvedName = name || answers.shift() || "";
    const resolvedBrief = brief || answers.shift() || "Criar uma experiência digital memorável, clara e orientada a resultado.";
    const success = options.sucesso || answers.shift() || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e validação real.";
    const essentials = options.essenciais || answers.shift() || "Experiência principal completa, estados de erro e vazio, responsividade e acessibilidade.";
    const constraints = options.restricoes || options["restrições"] || answers.shift() || "Preservar segurança, desempenho, identidade da marca e compatibilidade mobile.";
    const brandName = options.marca || answers.shift() || resolvedName;
    const audience = options.publico || options["público"] || answers.shift() || DEFAULT_BRAND.audience;
    const tone = options.tom || answers.shift() || DEFAULT_BRAND.tone;
    const accent = normalizeHexColor(options.cor || answers.shift() || DEFAULT_BRAND.accent);
    const favicon = options.favicon || answers.shift() || "auto";
    return { type: resolvedType, name: resolvedName, brief: resolvedBrief, success, essentials, constraints, brandName, audience, tone, accent, favicon };
  }

  const terminal = createInterface({ input, output });
  ui.title("SUPERMOTOR — novo projeto");

  try {
    let resolvedType = type;
    if (!resolvedType) {
      console.log("1. Site premium");
      console.log("2. Aplicação / dashboard");
      console.log("3. Carrossel social editável\n");
      console.log("4. CRM completo com WhatsApp\n");
      const choice = await terminal.question("Escolha o tipo [1-4]: ");
      resolvedType = { "1": "site", "2": "app", "3": "carousel", "4": "crm" }[choice.trim()] ?? normalizeType(choice);
    }

    const resolvedName = name || (await terminal.question("Nome do projeto: ")).trim();
    const resolvedBrief =
      brief ||
      (await terminal.question("Objetivo em uma frase (opcional): ")).trim() ||
      "Criar uma experiência digital memorável, clara e orientada a resultado.";
    let success = options.sucesso || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e validação real.";
    let essentials = options.essenciais || "Experiência principal completa, estados de erro e vazio, responsividade e acessibilidade.";
    let constraints = options.restricoes || options["restrições"] || "Preservar segurança, desempenho, identidade da marca e compatibilidade mobile.";
    let brandName = options.marca || resolvedName;
    let audience = options.publico || options["público"] || DEFAULT_BRAND.audience;
    let tone = options.tom || DEFAULT_BRAND.tone;
    let accent = options.cor || DEFAULT_BRAND.accent;

    if (!options.rapido && !options["modo-rápido"]) {
      success = options.sucesso || (await terminal.question("Como saberemos que o projeto deu certo? (opcional): ")).trim() || success;
      essentials = options.essenciais || (await terminal.question("O que precisa funcionar na primeira versão? (opcional): ")).trim() || essentials;
      constraints = options.restricoes || options["restrições"] || (await terminal.question("Há integrações, limites ou algo proibido? (opcional): ")).trim() || constraints;
      const customize = (await terminal.question("Personalizar a marca agora? [S/n]: ")).trim().toLowerCase();
      if (!["n", "nao", "não"].includes(customize)) {
        brandName = options.marca || (await terminal.question(`Nome da marca [${resolvedName}]: `)).trim() || resolvedName;
        audience = options.publico || options["público"] || (await terminal.question("Público principal (opcional): ")).trim() || DEFAULT_BRAND.audience;
        tone = options.tom || (await terminal.question("Personalidade da marca (opcional): ")).trim() || DEFAULT_BRAND.tone;
        accent = options.cor || (await terminal.question(`Cor de destaque [${DEFAULT_BRAND.accent}]: `)).trim() || DEFAULT_BRAND.accent;
      }
    }

    const favicon =
      options.favicon ||
      (options.rapido ? "auto" : (await terminal.question("Favicon: caminho para .ico/.png/.jpg/.svg ou Enter para gerar automaticamente: ")).trim()) ||
      "auto";

    return { type: resolvedType, name: resolvedName, brief: resolvedBrief, success, essentials, constraints, brandName, audience, tone, accent: normalizeHexColor(accent), favicon };
  } finally {
    terminal.close();
  }
}

function resolveCrmRepository(value) {
  const requested = String(value || WACRM_REPOSITORY).trim();
  const localPath = resolve(process.cwd(), requested);
  return existsSync(localPath) ? localPath : requested;
}

function createCrmProject(destination, answers, slug, parsed) {
  if (!commandExists("git")) {
    throw new Error("Git é obrigatório para criar um CRM a partir do wacrm.");
  }

  const repository = resolveCrmRepository(parsed.options["crm-repo"] || parsed.options["repositorio-crm"]);
  const sourceRef = String(parsed.options["crm-ref"] || parsed.options["versao-crm"] || WACRM_STABLE_REF).trim();
  const crmTemplate = join(TEMPLATE_ROOT, TYPES.crm.template);
  if (!existsSync(crmTemplate)) {
    throw new Error("Template de integração do wacrm ausente. Rode o diagnóstico.");
  }

  ui.title(`Criando ${TYPES.crm.label}`);
  ui.info(`Base oficial: ${repository} (${sourceRef})`);
  ui.info(`Destino: ${destination}`);

  const clone = runGit(["clone", "--depth", "1", "--branch", sourceRef, repository, destination], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (clone.status !== 0) {
    throw new Error(`Não foi possível clonar a base do wacrm${clone.error ? `: ${clone.error.message}` : "."}`);
  }

  copyTemplate(crmTemplate, destination);
  copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(destination, ".supermotor"));
  const tokens = projectTokens("crm", answers, slug, {
    CRM_REPOSITORY: repository,
    CRM_REF: sourceRef,
  });
  replaceTokens(join(destination, ".supermotor"), tokens);
  replaceTokensInFile(join(destination, "SUPERMOTOR.md"), tokens);

  const faviconSource = createCrmFavicon(destination, answers.favicon, answers.brandName, answers.accent);
  replaceTokens(join(destination, ".supermotor"), { FAVICON_SOURCE: faviconSource });
  initializeProjectTracking(destination, {
    projectType: "crm",
    name: answers.name.trim(),
    objective: answers.brief.trim(),
    success: answers.success.trim(),
    essentials: answers.essentials.trim(),
    constraints: answers.constraints.trim(),
    brand: answers.brandName.trim(),
    source: repository,
    sourceRef,
    upstream: WACRM_REPOSITORY,
    license: "MIT",
    motorVersion: "3.0.0",
  });

  ui.ok("wacrm clonado e contexto SUPERMOTOR aplicado");
  ui.ok(`Favicon: ${faviconSource}`);

  const displayPath = relative(process.cwd(), destination) || destination;
  console.log("\nPronto. Próximos passos:\n");
  console.log(`  cd "${displayPath}"`);
  console.log("  Leia SUPERMOTOR.md e siga a preparação.");
  console.log("  1. Crie uma conta grátis em supabase.com");
  console.log("  2. Configure o projeto Supabase e rode as migrações");
  console.log("  3. Configure o Meta WhatsApp Business API");
  console.log("  4. Preencha .env.local com as credenciais");
  console.log("  5. npm install && npm run dev");
  console.log("\nDepois, peça à IA:");
  console.log('  "Leia AGENTS.md, SUPERMOTOR.md, .supermotor/CONVERSATION.md e .supermotor/SUPERPROMPT.md. Registre seu andamento, configure o Supabase, execute o CRM e adapte-o ao meu negócio."');
  console.log(`\n${color("32", "CRM criado com sucesso:")} ${destination}\n`);
}

async function createProject(parsed) {
  const rawType = parsed.positionals[1];
  const rawName = parsed.positionals.slice(2).join(" ");
  const initialType = normalizeType(rawType);
  const briefOption = parsed.options.brief || parsed.options.objetivo || "";
  const answers = await promptForMissing(initialType, rawName, briefOption, parsed.options);
  const type = normalizeType(answers.type);

  if (!type) {
    throw new Error("Tipo inválido. Use site, app, carrossel ou crm.");
  }

  if (!answers.name?.trim()) {
    throw new Error("Informe um nome para o projeto.");
  }

  const slug = slugify(answers.name);
  if (!slug) {
    throw new Error("O nome precisa conter letras ou números.");
  }

  validateFaviconInput(answers.favicon);

  const explicitOutput = parsed.options.saida || parsed.options.output;
  const destination = explicitOutput
    ? resolve(process.cwd(), String(explicitOutput))
    : join(DEFAULT_OUTPUT, slug);

  if (existsSync(destination)) {
    throw new Error(`O destino já existe: ${destination}`);
  }

  if (type === "crm") {
    createCrmProject(destination, answers, slug, parsed);
    return;
  }

  const commonTemplate = join(TEMPLATE_ROOT, "common");
  const typeTemplate = join(TEMPLATE_ROOT, TYPES[type].template);
  if (!existsSync(commonTemplate) || !existsSync(typeTemplate)) {
    throw new Error(`Template incompleto para ${type}. Rode o diagnóstico.`);
  }

  ui.title(`Criando ${TYPES[type].label}`);
  ui.info(`Destino: ${destination}`);
  mkdirSync(destination, { recursive: true });
  copyTemplate(commonTemplate, destination);
  copyTemplate(typeTemplate, destination);
  copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(destination, ".supermotor"));

  replaceTokens(destination, projectTokens(type, answers, slug));

  const faviconSource = createFavicon(destination, answers.favicon, answers.brandName, answers.accent);
  replaceTokens(destination, { FAVICON_SOURCE: faviconSource });
  initializeProjectTracking(destination, {
    projectType: type,
    name: answers.name.trim(),
    objective: answers.brief.trim(),
    success: answers.success.trim(),
    essentials: answers.essentials.trim(),
    constraints: answers.constraints.trim(),
    brand: answers.brandName.trim(),
    motorVersion: "3.0.0",
  });

  ui.ok("Starter e contexto de IA criados");
  ui.ok(`Favicon: ${faviconSource}`);

  const skipInstall = Boolean(parsed.options["sem-instalar"] || parsed.options["skip-install"]);
  if (!skipInstall) npmInstall(destination);

  const displayPath = relative(process.cwd(), destination) || destination;
  console.log("\nPronto. Próximos passos:\n");
  console.log(`  cd "${displayPath}"`);
  if (skipInstall) console.log("  npm install");
  console.log("  npm run dev");
  console.log("\nDepois, peça à IA:");
  console.log('  "Leia SUPERPROMPT.md, PRODUCT.md, CONVERSATION.md, BRAND.md, DESIGN.md e QUALITY.md. Registre seu andamento e execute o projeto até passar em todos os critérios."');
  console.log(`\n${color("32", "Projeto criado com sucesso:")} ${destination}\n`);
}

function validateProject(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  ui.title("SUPERMOTOR — validação");
  ui.info(`Projeto: ${project}`);

  if (!existsSync(project) || !statSync(project).isDirectory()) {
    throw new Error(`Projeto não encontrado: ${project}`);
  }

  const crmMarker = join(project, ".supermotor", "project.json");
  if (existsSync(crmMarker)) {
    try {
      const metadata = JSON.parse(readFileSync(crmMarker, "utf8"));
      if (metadata.projectType === "crm") {
        validateCrmProject(project, parsed);
        return;
      }
    } catch {
      throw new Error("Metadados inválidos em .supermotor/project.json.");
    }
  }

  const failures = [];
  const pass = (condition, success, failure) => {
    if (condition) ui.ok(success);
    else {
      ui.fail(failure);
      failures.push(failure);
    }
  };

  for (const file of ["package.json", "PRODUCT.md", "CONVERSATION.md", "BRAND.md", "DESIGN.md", "QUALITY.md", "SUPERPROMPT.md", ".supermotor/project.json", ".supermotor/agent.mjs", ".supermotor/AGENT_PROTOCOL.md"]) {
    pass(existsSync(join(project, file)), file, `Arquivo obrigatório ausente: ${file}`);
  }

  const appDirectory = join(project, "src", "app");
  const appFiles = existsSync(appDirectory) ? readdirSync(appDirectory) : [];
  const hasFavicon = appFiles.some((file) => /^(favicon\.ico|icon\.(ico|jpe?g|png|svg|tsx?|jsx?))$/i.test(file));
  pass(hasFavicon, "Favicon configurado", "Favicon ausente em src/app");

  const sourceFiles = collectFiles(join(project, "src"));
  const readableFiles = sourceFiles.filter((file) => /\.(css|html|js|jsx|ts|tsx)$/i.test(file));
  const source = readableFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  const contextFiles = ["package.json", "PRODUCT.md", "CONVERSATION.md", "BRAND.md", "DESIGN.md", "QUALITY.md", "SUPERPROMPT.md", "AGENTS.md", ".supermotor/project.json", ".supermotor/AGENT_PROTOCOL.md"]
    .map((file) => join(project, file))
    .filter((file) => existsSync(file));
  const projectContext = [...readableFiles, ...contextFiles].map((file) => readFileSync(file, "utf8")).join("\n");
  const forbiddenZoom = /userScalable\s*:\s*false|user-scalable\s*=\s*no|maximumScale\s*:\s*[01](?:\D|$)|maximum-scale\s*=\s*[01](?:\D|$)/i;
  pass(!forbiddenZoom.test(source), "Zoom acessível preservado", "Configuração bloqueia o zoom do usuário");
  pass(/width\s*:\s*["']device-width["']/.test(source) && /initialScale\s*:\s*1/.test(source), "Viewport mobile correta", "Viewport width=device-width e initialScale=1 não encontrada");
  pass(/overflow-x\s*:\s*(clip|hidden)/i.test(source), "Overflow horizontal protegido", "Proteção contra overflow horizontal ausente");
  pass(/-webkit-text-size-adjust\s*:\s*100%/i.test(source), "Escala de texto mobile estável", "-webkit-text-size-adjust: 100% ausente");
  pass(/touch-action\s*:\s*manipulation/i.test(source), "Autozoom em controles reduzido", "touch-action: manipulation ausente nos controles");
  pass(/font-size\s*:\s*16px\s*!important/i.test(source), "Inputs mobile com tamanho seguro", "Proteção global de 16px para inputs mobile ausente");
  pass(!/__(PROJECT|BRAND|FAVICON)_/.test(projectContext), "Tokens substituídos", "Há tokens do template sem substituição");

  if (failures.length > 0) {
    console.log(`\n${failures.length} problema(s) precisam ser corrigidos.\n`);
    process.exitCode = 1;
    return;
  }

  const skipBuild = Boolean(parsed.options["sem-build"] || parsed.options["static-only"]);
  if (skipBuild) {
    console.log("\nValidação estática aprovada.\n");
    return;
  }

  if (!existsSync(join(project, "node_modules"))) {
    ui.fail("Dependências ausentes. Rode npm install ou use --sem-build.");
    process.exitCode = 1;
    return;
  }

  ui.info("Executando typecheck, lint e build...");
  const result = runNpm(["run", "check"], { cwd: project, stdio: "inherit" });
  if (result.status !== 0) {
    if (result.error) ui.fail(result.error.message);
    ui.fail("Quality gate técnica reprovada");
    process.exitCode = result.status || 1;
    return;
  }

  ui.ok("Quality gate técnica aprovada");
  console.log("\nProjeto aprovado pelo SUPERMOTOR.\n");
}

function validateCrmProject(project, parsed) {
  const failures = [];
  const pass = (condition, success, failure) => {
    if (condition) ui.ok(success);
    else {
      ui.fail(failure);
      failures.push(failure);
    }
  };

  const requiredFiles = [
    "package.json",
    "AGENTS.md",
    "SUPERMOTOR.md",
    "src/app/layout.tsx",
    "next.config.ts",
    ".supermotor/project.json",
    ".supermotor/PRODUCT.md",
    ".supermotor/CONVERSATION.md",
    ".supermotor/BRAND.md",
    ".supermotor/QUALITY.md",
    ".supermotor/SUPERPROMPT.md",
    ".supermotor/agent.mjs",
    ".supermotor/AGENT_PROTOCOL.md",
  ];
  for (const file of requiredFiles) {
    pass(existsSync(join(project, file)), file, `Arquivo obrigatório ausente: ${file}`);
  }

  const publicDirectory = join(project, "public");
  const publicFiles = existsSync(publicDirectory) ? readdirSync(publicDirectory) : [];
  pass(publicFiles.some((file) => /^supermotor-icon\.(ico|jpe?g|png|svg)$/i.test(file)), "Favicon do CRM configurado", "Favicon do CRM ausente em public");

  const globalsPath = join(project, "src", "app", "globals.css");
  const css = existsSync(globalsPath) ? readFileSync(globalsPath, "utf8") : "";
  pass(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*[01](?:\D|$)/i.test(css), "Zoom acessível preservado", "Viewport do CRM bloqueia o zoom do usuário");
  pass(/overflow-x\s*:\s*(clip|hidden)/i.test(css), "Overflow horizontal protegido", "Proteção contra overflow horizontal ausente");
  pass(/-webkit-text-size-adjust\s*:\s*100%/i.test(css), "Escala de texto mobile estável", "Escala de texto mobile não protegida");
  pass(/touch-action\s*:\s*manipulation/i.test(css), "Interações de toque protegidas", "touch-action: manipulation ausente");
  pass(/font-size\s*:\s*16px\s*!important/i.test(css), "Inputs mobile com tamanho seguro", "Proteção de 16px para inputs mobile ausente");

  const contextDirectory = join(project, ".supermotor");
  const contextFiles = existsSync(contextDirectory) ? collectFiles(contextDirectory).filter((file) => /\.(json|md)$/i.test(file)) : [];
  const context = [...contextFiles, join(project, "SUPERMOTOR.md")]
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  pass(!/__(PROJECT|BRAND|FAVICON|CRM)_/.test(context), "Tokens substituídos", "Há tokens do CRM sem substituição");

  if (failures.length > 0) {
    console.log(`\n${failures.length} problema(s) precisam ser corrigidos.\n`);
    process.exitCode = 1;
    return;
  }

  const skipBuild = Boolean(parsed.options["sem-build"] || parsed.options["static-only"]);
  if (skipBuild) {
    console.log("\nValidação estática do wacrm aprovada.\n");
    return;
  }

  if (!existsSync(join(project, "node_modules"))) {
    ui.fail("Dependências ausentes. Rode npm install ou use --sem-build.");
    process.exitCode = 1;
    return;
  }

  ui.info("Executando build do wacrm...");
  const build = runNpm(["run", "build"], { cwd: project, stdio: "inherit" });
  if (build.status !== 0) {
    ui.fail("Build do wacrm reprovado");
    process.exitCode = build.status || 1;
    return;
  }

  ui.ok("Quality gate técnica do wacrm aprovada");
  console.log("\nCRM aprovado pelo SUPERMOTOR.\n");
}

function recordActivity(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  if (!existsSync(join(project, ".supermotor", "project.json"))) {
    throw new Error(`Projeto SUPERMOTOR não encontrado em: ${project}`);
  }
  const activity = appendActivity(project, {
    agent: parsed.options.agent || parsed.options.agente || "Agente",
    status: parsed.options.status || "working",
    action: parsed.options.action || parsed.options.acao || parsed.options["ação"] || "Atualizando o projeto",
    detail: parsed.options.detail || parsed.options.detalhe || "",
  });
  ui.ok(`${activity.agent}: ${activity.action}`);
}

function registerExistingProject(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  if (!existsSync(project) || !statSync(project).isDirectory()) {
    throw new Error(`Projeto não encontrado: ${project}`);
  }
  let packageMetadata = {};
  const packagePath = join(project, "package.json");
  if (existsSync(packagePath)) {
    try {
      packageMetadata = JSON.parse(readFileSync(packagePath, "utf8"));
    } catch {
      ui.warn("package.json inválido; usando o nome da pasta.");
    }
  }
  const inferredCrm = existsSync(join(project, "src", "app", "layout.tsx")) && existsSync(join(project, "supabase", "migrations"));
  copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(project, ".supermotor"));
  const metadata = initializeProjectTracking(project, {
    projectType: parsed.options.tipo || parsed.options.type || (inferredCrm ? "crm" : "project"),
    name: parsed.options.nome || parsed.options.name || packageMetadata.name || project.split(/[\\/]/).pop(),
    objective: parsed.options.brief || parsed.options.objetivo || "Projeto existente registrado para acompanhamento local.",
    success: parsed.options.sucesso || "Tarefas, agentes e entregas acompanhados com clareza.",
    essentials: parsed.options.essenciais || "Preservar o que já funciona e concluir o fluxo principal.",
    constraints: parsed.options.restricoes || "Não registrar segredos ou dados confidenciais no histórico de atividades.",
    brand: parsed.options.marca || "",
    motorVersion: "3.0.0",
  });
  ui.ok(`Projeto registrado no painel: ${metadata.name}`);
  console.log(`Abra com: ${process.platform === "win32" ? ".\\supermotor.ps1" : "./supermotor.sh"} painel`);
}

function dashboardControlFile() {
  return join(STATE_ROOT, "control-room.json");
}

function readDashboardControl() {
  const path = dashboardControlFile();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function processIsAlive(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function openLocalUrl(url) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(String(url))) return;
  let command;
  let args;
  if (process.platform === "win32") {
    command = process.env.ComSpec || "cmd.exe";
    args = ["/d", "/s", "/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

async function startDashboardDaemon(parsed) {
  const controlPath = dashboardControlFile();
  const existing = readDashboardControl();
  const shouldOpen = !Boolean(parsed.options["nao-abrir"] || parsed.options["não-abrir"] || parsed.options["no-open"]);
  if (existing && processIsAlive(existing.pid)) {
    ui.ok(`Control Room já está ativa em ${existing.url}`);
    if (shouldOpen) openLocalUrl(existing.url);
    return;
  }
  if (existsSync(controlPath)) unlinkSync(controlPath);
  mkdirSync(STATE_ROOT, { recursive: true });
  const port = Number(parsed.options.porta || parsed.options.port || 4545);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Porta inválida para o painel.");
  const args = [join(ROOT, "bin", "dashboard-server.mjs"), "--porta", String(port)];
  if (!shouldOpen) args.push("--nao-abrir");
  const child = spawn(process.execPath, args, {
    detached: true,
    env: { ...process.env, SUPERMOTOR_CONTROL_FILE: controlPath },
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    const control = readDashboardControl();
    if (control?.pid === child.pid && processIsAlive(control.pid)) {
      ui.ok(`Control Room iniciada em ${control.url}`);
      return;
    }
    if (!processIsAlive(child.pid)) break;
  }
  if (processIsAlive(child.pid)) process.kill(child.pid);
  throw new Error("A Control Room não iniciou. Rode `supermotor painel` para ver o erro no terminal.");
}

function stopDashboardDaemon() {
  const controlPath = dashboardControlFile();
  const control = readDashboardControl();
  if (!control || !processIsAlive(control.pid)) {
    if (existsSync(controlPath)) unlinkSync(controlPath);
    ui.warn("A Control Room não está ativa em segundo plano.");
    return;
  }
  process.kill(Number(control.pid));
  if (existsSync(controlPath)) unlinkSync(controlPath);
  ui.ok("Control Room encerrada.");
}

function dashboardDaemonStatus() {
  const control = readDashboardControl();
  if (control && processIsAlive(control.pid)) ui.ok(`Control Room ativa em ${control.url} (PID ${control.pid})`);
  else ui.warn("Control Room não está ativa em segundo plano.");
}

function doctor() {
  ui.title("SUPERMOTOR — diagnóstico");
  let healthy = true;
  const major = Number(process.versions.node.split(".")[0]);

  if (major >= 20) ui.ok(`Node.js ${process.versions.node}`);
  else {
    ui.fail(`Node.js ${process.versions.node}; use a versão 20 ou superior`);
    healthy = false;
  }

  for (const command of ["npm", "git"]) {
    if (commandExists(command)) ui.ok(`${command} disponível`);
    else {
      ui.fail(`${command} não encontrado`);
      healthy = false;
    }
  }

  if (commandExists("docker")) ui.ok("Docker disponível para CRM via Supabase local");
  else ui.warn("Para o CRM, tenha uma conta grátis em supabase.com");

  for (const template of ["common", "tracking", ...Object.values(TYPES).map((item) => item.template)]) {
    const path = join(TEMPLATE_ROOT, template);
    if (existsSync(path)) ui.ok(`Template ${template}`);
    else {
      ui.fail(`Template ausente: ${path}`);
      healthy = false;
    }
  }

  const optionalResources = [
    "libs/impeccable",
    "libs/fallow",
    "libs/graphify",
    "skills/frontend-design.md",
    "skills/ui-ux-pro-max",
  ];
  for (const item of optionalResources) {
    if (existsSync(join(ROOT, item))) ui.ok(item);
    else ui.warn(`${item} ainda não instalado; rode setup.ps1 ou setup.sh`);
  }

  console.log(healthy ? "\nMotor pronto para criar projetos.\n" : "\nCorrija os itens acima antes de criar projetos.\n");
  process.exitCode = healthy ? 0 : 1;
}

function help() {
  console.log(`
SUPERMOTOR 3.0

Uso:
  supermotor criar site "Nome do projeto"
  supermotor criar app "Nome do projeto"
  supermotor criar carrossel "Nome do projeto"
  supermotor criar crm "Nome do CRM"
  supermotor painel
  supermotor painel iniciar|parar|status
  supermotor registrar [caminho]
  supermotor atividade [projeto] --agente "Nome" --status working --acao "O que está fazendo"
  supermotor validar [caminho]
  supermotor doctor

Opções:
  --brief "objetivo"       Define o objetivo do projeto
  --sucesso "resultado"    Define como medir o sucesso
  --essenciais "itens"     Define o que precisa funcionar primeiro
  --restricoes "limites"   Define integrações, limites e proibições
  --marca "nome"           Define o nome da marca
  --publico "descrição"    Define o público principal
  --tom "personalidade"    Define a personalidade da marca
  --cor "#ff5a1f"          Define a cor de destaque
  --favicon caminho        Usa um favicon .ico, .png, .jpg ou .svg
  --crm-repo caminho/url   Usa um fork ou espelho do wacrm
  --crm-ref referência     Define branch/tag do CRM (padrão: main estável)
  --rapido                  Usa Brand Kit e favicon automáticos
  --saida caminho          Define a pasta exata de destino
  --sem-instalar           Cria os arquivos sem executar npm install
  --sem-build              Faz somente validação estática
  --porta 4545             Define a porta do painel local
  --nao-abrir              Inicia o painel sem abrir o navegador

Sem argumentos, o criador abre o assistente guiado.
`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.positionals[0]?.toLowerCase();

  if (parsed.options.help || ["help", "ajuda", "--help", "-h"].includes(command)) {
    help();
    return;
  }

  if (!command) {
    parsed.positionals = ["criar"];
    await createProject(parsed);
    return;
  }

  if (["doctor", "diagnostico", "diagnóstico"].includes(command)) {
    doctor();
    return;
  }

  if (["validate", "validar", "check"].includes(command)) {
    validateProject(parsed);
    return;
  }

  if (["painel", "dashboard", "monitor", "acompanhar"].includes(command)) {
    const dashboardAction = parsed.positionals[1]?.toLowerCase();
    if (["iniciar", "start", "background", "segundo-plano"].includes(dashboardAction)) {
      await startDashboardDaemon(parsed);
      return;
    }
    if (["parar", "stop", "encerrar"].includes(dashboardAction)) {
      stopDashboardDaemon();
      return;
    }
    if (["status", "estado"].includes(dashboardAction)) {
      dashboardDaemonStatus();
      return;
    }
    const { startDashboard } = await import("./dashboard-server.mjs");
    await startDashboard({
      port: Number(parsed.options.porta || parsed.options.port || 4545),
      open: !Boolean(parsed.options["nao-abrir"] || parsed.options["não-abrir"] || parsed.options["no-open"]),
    });
    return;
  }

  if (["atividade", "activity", "evento", "event"].includes(command)) {
    recordActivity(parsed);
    return;
  }

  if (["registrar", "register", "adicionar-projeto", "track"].includes(command)) {
    registerExistingProject(parsed);
    return;
  }

  if (["create", "criar", "novo", "new"].includes(command)) {
    await createProject(parsed);
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error) => {
  ui.fail(error.message);
  process.exitCode = 1;
});
