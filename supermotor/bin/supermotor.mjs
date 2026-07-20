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

const SKILLS_ROOT = join(ROOT, "skills");
const UUPM_DATA = join(SKILLS_ROOT, "ui-ux-pro-max", "src", "ui-ux-pro-max", "data");

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function readCSV(filename) {
  const path = join(UUPM_DATA, filename);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row;
  });
}

function scoreMatch(text, keywords) {
  if (!text || !keywords) return 0;
  const lower = text.toLowerCase();
  const words = keywords.toLowerCase().split(/[,\s]+/).filter(Boolean);
  let score = 0;
  for (const word of words) {
    if (lower.includes(word)) score += 1;
  }
  return score;
}

function findBestProductType(industry, description, goal) {
  const products = readCSV("products.csv");
  if (!products.length) return null;
  const searchText = [industry, description, goal].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of products) {
    const score = scoreMatch(searchText, row.Keywords);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findBestColorPalette(productType) {
  const colors = readCSV("colors.csv");
  if (!colors.length) return null;
  const search = productType || "";
  let best = null;
  let bestScore = 0;
  for (const row of colors) {
    const score = scoreMatch(search, row["Product Type"]) + (row["Product Type"] === productType ? 10 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findBestTypography(tone, personality, industry) {
  const typography = readCSV("typography.csv");
  if (!typography.length) return null;
  const searchText = [tone, personality, industry].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of typography) {
    const score = scoreMatch(searchText, row["Mood/Style Keywords"]);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  if (!best) best = typography[1];
  return best;
}

function findBestStyle(productType, tone) {
  const styles = readCSV("styles.csv");
  if (!styles.length) return null;
  const searchText = [productType, tone].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of styles) {
    const score = scoreMatch(searchText, row.Keywords) + scoreMatch(searchText, row["Best For"]);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findBestLandingPattern(projectType, goal) {
  const landing = readCSV("landing.csv");
  if (!landing.length) return null;
  const searchText = [projectType, goal].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of landing) {
    const score = scoreMatch(searchText, row.Keywords);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findReasoningRules(industry) {
  const reasoning = readCSV("ui-reasoning.csv");
  if (!reasoning.length) return null;
  let best = null;
  let bestScore = 0;
  for (const row of reasoning) {
    const score = scoreMatch(industry, row.UI_Category);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function generateDesignRecommendations(data) {
  const product = findBestProductType(data.businessIndustry, data.businessDescription, data.digitalGoal);
  const palette = findBestColorPalette(product?.["Product Type"]);
  const typography = findBestTypography(data.brandTone, data.brandPersonality, data.businessIndustry);
  const style = findBestStyle(product?.["Product Type"], data.brandTone);
  const landing = findBestLandingPattern(data.projectType, data.digitalGoal);
  const reasoning = findReasoningRules(data.businessIndustry);

  return { product, palette, typography, style, landing, reasoning };
}

function generateDesignMarkdown(recs, data) {
  const lines = [];
  lines.push("# Design Inteligente — Recomendações UI/UX");
  lines.push(`> Gerado pelo SUPERMOTOR 3.0 com a skill ui-ux-pro-max\n`);

  if (recs.product) {
    lines.push("## Tipo de Produto Recomendado\n");
    lines.push(`- **Categoria:** ${recs.product["Product Type"]}`);
    lines.push(`- **Estilo principal:** ${recs.product["Primary Style Recommendation"]}`);
    lines.push(`- **Estilos secundários:** ${recs.product["Secondary Styles"]}`);
    lines.push(`- **Padrão de landing:** ${recs.product["Landing Page Pattern"]}`);
    lines.push(`- **Dashboard:** ${recs.product["Dashboard Style (if applicable)"]}`);
    lines.push(`- **Paleta de cores:** ${recs.product["Color Palette Focus"]}`);
    lines.push(`- **Considerações:** ${recs.product["Key Considerations"]}`);
    lines.push("");
  }

  if (recs.palette) {
    lines.push("## Paleta de Cores Recomendada\n");
    lines.push(`| Função | Cor |`);
    lines.push(`|--------|-----|`);
    lines.push(`| Primária | ${recs.palette.Primary} |`);
    lines.push(`| Secundária | ${recs.palette.Secondary} |`);
    lines.push(`| Destaque | ${recs.palette.Accent} |`);
    lines.push(`| Fundo | ${recs.palette.Background} |`);
    lines.push(`| Texto | ${recs.palette.Foreground} |`);
    lines.push(`| Card | ${recs.palette.Card} |`);
    lines.push(`| Bordas | ${recs.palette.Border} |`);
    lines.push(`| Erro | ${recs.palette.Destructive} |`);
    lines.push(`| Foco | ${recs.palette.Ring} |`);
    lines.push(`\n> ${recs.palette.Notes}\n`);
  }

  if (recs.typography) {
    lines.push("## Tipografia Recomendada\n");
    lines.push(`- **Par de fontes:** ${recs.typography["Font Pairing Name"]}`);
    lines.push(`- **Fonte de título:** ${recs.typography["Heading Font"]}`);
    lines.push(`- **Fonte de corpo:** ${recs.typography["Body Font"]}`);
    lines.push(`- **Categoria:** ${recs.typography.Category}`);
    lines.push(`- **Mood:** ${recs.typography["Mood/Style Keywords"]}`);
    lines.push(`- **Melhor para:** ${recs.typography["Best For"]}`);
    lines.push(`\n### Importação Google Fonts\n`);
    lines.push("```css");
    lines.push(recs.typography["CSS Import"] || "");
    lines.push("```\n");
    lines.push("### Configuração Tailwind\n");
    lines.push("```js");
    lines.push(recs.typography["Tailwind Config"] || "");
    lines.push("```\n");
    lines.push(`> ${recs.typography.Notes}\n`);
  }

  if (recs.style) {
    lines.push("## Estilo Visual Recomendado\n");
    lines.push(`- **Categoria:** ${recs.style["Style Category"]}`);
    lines.push(`- **Tipo:** ${recs.style.Type}`);
    lines.push(`- **Melhor para:** ${recs.style["Best For"]}`);
    lines.push(`- **NÃO usar para:** ${recs.style["Do Not Use For"]}`);
    lines.push(`- **Performance:** ${recs.style.Performance}`);
    lines.push(`- **Acessibilidade:** ${recs.style.Accessibility}`);
    lines.push(`- **Mobile:** ${recs.style["Mobile-Friendly"]}`);
    lines.push(`- **Conversão:** ${recs.style["Conversion-Focused"]}`);
    lines.push(`- **Complexidade:** ${recs.style.Complexity}`);
    lines.push(`- **Era/Origem:** ${recs.style["Era/Origin"]}`);
    lines.push(`\n### Prompt para IA\n`);
    lines.push(`> ${recs.style["AI Prompt Keywords"]}\n`);
    lines.push(`### Variáveis de Design System\n`);
    lines.push("```css");
    lines.push(recs.style["Design System Variables"] || "");
    lines.push("```\n");
    lines.push(`### Checklist de Implementação\n`);
    lines.push((recs.style["Implementation Checklist"] || "").split(", ").map((item) => `- ${item}`).join("\n"));
    lines.push("");
  }

  if (recs.landing && (data.projectType === "site" || data.projectType === "carousel")) {
    lines.push("## Padrão de Landing Page\n");
    lines.push(`- **Padrão:** ${recs.landing["Pattern Name"]}`);
    lines.push(`- **Ordem das seções:** ${recs.landing["Section Order"]}`);
    lines.push(`- **CTA principal:** ${recs.landing["Primary CTA Placement"]}`);
    lines.push(`- **Estratégia de cores:** ${recs.landing["Color Strategy"]}`);
    lines.push(`- **Efeitos recomendados:** ${recs.landing["Recommended Effects"]}`);
    lines.push(`- **Otimização de conversão:** ${recs.landing["Conversion Optimization"]}`);
    lines.push("");
  }

  if (recs.reasoning) {
    lines.push("## Regras de Raciocínio por Indústria\n");
    lines.push(`- **Padrão recomendado:** ${recs.reasoning.Recommended_Pattern}`);
    lines.push(`- **Prioridade de estilo:** ${recs.reasoning.Style_Priority}`);
    lines.push(`- **Mood de cores:** ${recs.reasoning.Color_Mood}`);
    lines.push(`- **Mood de tipografia:** ${recs.reasoning.Typography_Mood}`);
    lines.push(`- **Efeitos chave:** ${recs.reasoning.Key_Effects}`);
    lines.push(`- **Anti-padrões:** ${recs.reasoning.Anti_Patterns}`);
    lines.push(`- **Severidade:** ${recs.reasoning.Severity}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("> Estas recomendações foram geradas automaticamente pela skill ui-ux-pro-max.");
  lines.push("> Use como base para DESIGN.md do projeto.\n");

  return lines.join("\n");
}

function generateBrandKitMarkdown(data) {
  const lines = [];
  lines.push("# Brand Kit — Identidade Visual");
  lines.push(`> Gerado pelo SUPERMOTOR 3.0\n`);

  lines.push("## Informações da Marca\n");
  lines.push(`- **Nome:** ${data.brandName || data.businessName || "—"}`);
  lines.push(`- **Negócio:** ${data.businessName || "—"}`);
  lines.push(`- **Área:** ${data.businessIndustry || "—"}`);
  lines.push(`- **Público:** ${data.targetAudience || "—"}`);
  lines.push("");

  lines.push("## Personalidade\n");
  lines.push(`- **Tom de voz:** ${data.brandTone || "—"}`);
  lines.push(`- **Personalidade:** ${data.brandPersonality || "—"}`);
  lines.push(`- **Cores preferidas:** ${data.brandColors || "—"}`);
  lines.push("");

  lines.push("## Paleta de Cores\n");
  lines.push(`- **Cor de destaque:** ${data.brandAccent || "#ff5a1f"}`);
  lines.push("");

  lines.push("## Ativos\n");
  lines.push(`- **Logo:** ${data.hasLogo || "Não"}`);
  lines.push(`- **Favicon:** ${data.hasFavicon || "Não"}`);
  lines.push(`- **Referências visuais:** ${data.visualReferences || "Nenhuma"}`);
  lines.push("");

  lines.push("---");
  lines.push("> Brand Kit completo. Use como referência para criar BRAND.md e DESIGN.md.\n");

  return lines.join("\n");
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

function onboardingProgress(current, total) {
  const filled = Math.round((current / total) * 20);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
  console.log(color("2", `  [${bar}] ${current}/${total}\n`));
}

function onboardingGreeting() {
  console.log();
  console.log(color("1;38;5;208", "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
  console.log(color("1;38;5;208", "\u2551") + color("1;37", "                  SUPERMOTOR 3.0                          ") + color("1;38;5;208", "\u2551"));
  console.log(color("1;38;5;208", "\u2551") + color("36", "       O sistema operacional do seu negocio               ") + color("1;38;5;208", "\u2551"));
  console.log(color("1;38;5;208", "\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d"));
  console.log();
  console.log(color("37", "  Ola! Bem-vindo ao SUPERMOTOR."));
  console.log();
  console.log("  Vou te conhecer melhor para criar o projeto ideal para");
  console.log("  o seu negocio. Sao 10 fases rapidas.");
  console.log();
  console.log("  Cada pergunta tem um motivo. Vou explicar por que importa.");
  console.log("  Tudo fica salvo no contexto do projeto.\n");
  console.log(color("33", "  Dica: pressione Enter para pular perguntas opcionais."));
  console.log(color("33", "  Respostas em branco usam os valores padrao.\n"));
}

function onboardingSep() {
  console.log(color("2", "  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"));
}

function onboardingQuestion(text) {
  console.log(color("1;36", `  ? ${text}`));
}

function onboardingHint(text) {
  console.log(color("2", `    ${text}`));
}

function onboardingInfo(text) {
  console.log(color("32", `  > ${text}`));
}

function onboardingPhase(num, title, total) {
  console.log();
  console.log(color("1;38;5;208", `  === Fase ${num}/${total}: ${title} ===`));
  console.log();
  onboardingProgress(num, total);
}

function generateOnboardingContext(data) {
  const lines = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push(`# Contexto do Onboarding — ${data.businessName || data.userName || "Novo usuario"}`);
  lines.push(`> Gerado em ${date} pelo SUPERMOTOR 3.0`);
  lines.push(`> Skill: ui-ux-pro-max v2.11.0 integrada\n`);

  lines.push("---\n");

  lines.push("## Sobre Voce\n");
  lines.push(`- **Nome:** ${data.userName || "Nao informado"}`);
  lines.push(`- **Email:** ${data.userEmail || "Nao informado"}`);
  lines.push(`- **WhatsApp:** ${data.userPhone || "Nao informado"}`);
  lines.push(`- **Instagram:** ${data.userInstagram || "Nao informado"}`);
  lines.push(`- **Localizacao:** ${data.userLocation || "Nao informado"}`);
  lines.push("");

  lines.push("## Sobre o Negocio\n");
  lines.push(`- **Nome do negocio:** ${data.businessName || "Nao informado"}`);
  lines.push(`- **Area/Industria:** ${data.businessIndustry || "Nao informado"}`);
  lines.push(`- **Descricao:** ${data.businessDescription || "Nao informado"}`);
  lines.push(`- **Tempo de mercado:** ${data.businessAge || "Nao informado"}`);
  lines.push(`- **Porte:** ${data.businessSize || "Nao informado"}`);
  lines.push(`- **Localizacao do negocio:** ${data.businessLocation || "Nao informado"}`);
  lines.push(`- **Site atual:** ${data.businessWebsite || "Nao possui"}`);
  lines.push(`- **Redes sociais:** ${data.businessSocial || "Nao informado"}`);
  lines.push("");

  lines.push("## Objetivos e Visao\n");
  lines.push(`- **Objetivo principal:** ${data.mainGoal || "Nao informado"}`);
  lines.push(`- **O que quer alcancar digitalmente:** ${data.digitalGoal || "Nao informado"}`);
  lines.push(`- **Principal desafio:** ${data.mainChallenge || "Nao informado"}`);
  lines.push(`- **Onde se ve em 1 ano:** ${data.visionOneYear || "Nao informado"}`);
  lines.push(`- **Metrica de sucesso:** ${data.successMetric || "Nao informado"}`);
  lines.push("");

  lines.push("## Publico-Alvo\n");
  lines.push(`- **Publico principal:** ${data.targetAudience || "Nao informado"}`);
  lines.push(`- **Idade/faixa etaria:** ${data.audienceAge || "Nao informado"}`);
  lines.push(`- **Genero predominante:** ${data.audienceGender || "Nao informado"}`);
  lines.push(`- **Classe social/Renda:** ${data.audienceClass || "Nao informado"}`);
  lines.push(`- **Dores e necessidades:** ${data.audiencePains || "Nao informado"}`);
  lines.push(`- **Onde o publico esta:** ${data.audienceWhere || "Nao informado"}`);
  lines.push(`- **Como o publico te encontra:** ${data.audienceFindYou || "Nao informado"}`);
  lines.push("");

  lines.push("## Modelo de Negocio\n");
  lines.push(`- **Como fatura/recebe:** ${data.revenueModel || "Nao informado"}`);
  lines.push(`- **Produtos/servicos principais:** ${data.mainProducts || "Nao informado"}`);
  lines.push(`- **Faixa de preco:** ${data.priceRange || "Nao informado"}`);
  lines.push(`- **Ticket medio:** ${data.averageTicket || "Nao informado"}`);
  lines.push(`- **Concorrentes principais:** ${data.competitors || "Nao informado"}`);
  lines.push(`- **Diferencial competitivo:** ${data.differentiator || "Nao informado"}`);
  lines.push("");

  lines.push("## Projeto Digital\n");
  lines.push(`- **Tipo de projeto:** ${data.projectType || "Nao definido"}`);
  lines.push(`- **Nome do projeto:** ${data.projectName || "Nao definido"}`);
  lines.push(`- **Objetivo do projeto:** ${data.projectObjective || "Nao definido"}`);
  lines.push(`- **Funcionalidades essenciais:** ${data.projectFeatures || "Nao definido"}`);
  lines.push(`- **Paginas/secoes necessarias:** ${data.projectPages || "Nao definido"}`);
  lines.push(`- **Referencias/inspiracoes:** ${data.projectReferences || "Nenhuma"}`);
  lines.push(`- **Integracoes necessarias:** ${data.projectIntegrations || "Nenhuma"}`);
  lines.push(`- **Restricoes tecnicas:** ${data.projectConstraints || "Nenhuma"}`);
  lines.push("");

  lines.push("## Identidade Visual\n");
  lines.push(`- **Nome da marca:** ${data.brandName || data.businessName || "Nao informado"}`);
  lines.push(`- **Tom de voz:** ${data.brandTone || "Nao informado"}`);
  lines.push(`- **Personalidade:** ${data.brandPersonality || "Nao informado"}`);
  lines.push(`- **Cores preferidas:** ${data.brandColors || "Nao informado"}`);
  lines.push(`- **Cor de destaque:** ${data.brandAccent || "#ff5a1f"}`);
  lines.push(`- **Tem logo:** ${data.hasLogo || "Nao"}`);
  lines.push(`- **Ja tem favicon:** ${data.hasFavicon || "Nao"}`);
  lines.push(`- **Referencias visuais:** ${data.visualReferences || "Nenhuma"}`);
  lines.push("");

  lines.push("## Aspectos Tecnicos\n");
  lines.push(`- **Hospedagem atual:** ${data.currentHosting || "Nao possui"}`);
  lines.push(`- **Dominio:** ${data.domain || "Nao possui"}`);
  lines.push(`- **Plataforma atual:** ${data.currentPlatform || "Nenhuma"}`);
  lines.push(`- **Precisa de SEO:** ${data.needsSEO || "Sim"}`);
  lines.push(`- **Precisa de analytics:** ${data.needsAnalytics || "Sim"}`);
  lines.push(`- **Idiomas:** ${data.languages || "Portugues (pt-BR)"}`);
  lines.push(`- **Acessibilidade:** ${data.accessibility || "Padrao WCAG"}`);
  lines.push("");

  lines.push("## Presenca Digital Atual\n");
  lines.push(`- **Ja tem site:** ${data.hasWebsite || "Nao"}`);
  lines.push(`- **Redes sociais ativas:** ${data.activeSocialMedia || "Nenhuma"}`);
  lines.push(`- **Frequencia de publicacao:** ${data.postingFrequency || "Nao publica"}`);
  lines.push(`- **E-mail marketing:** ${data.emailMarketing || "Nao utiliza"}`);
  lines.push(`- **Lista de contatos:** ${data.contactList || "Nao possui"}`);
  lines.push(`- **WhatsApp Business:** ${data.whatsappBusiness || "Nao utiliza"}`);
  lines.push("");

  lines.push("## Proximos Passos\n");
  lines.push(`- **Urgencia:** ${data.urgency || "Nao definida"}`);
  lines.push(`- **Orcamento estimado:** ${data.budget || "Nao definido"}`);
  lines.push(`- **Prazo desejado:** ${data.deadline || "Nao definido"}`);
  lines.push(`- **Quem decide:** ${data.decisionMaker || "O proprio usuario"}`);
  lines.push(`- **Tem equipe tecnica:** ${data.hasTechTeam || "Nao"}`);
  lines.push(`- **Quer gerenciar sozinho:** ${data.selfManage || "Sim"}`);
  lines.push("");

  lines.push("---\n");
  lines.push(`> Contexto completo. Use este arquivo como base para criar projetos.`);
  lines.push(`> O SUPERMOTOR pode ler estes dados automaticamente ao usar \`supermotor criar\`.\n`);

  return lines.join("\n");
}

async function runOnboarding() {
  const terminal = createInterface({ input, output });
  const TOTAL_PHASES = 10;

  try {
    onboardingGreeting();
    const data = {};

    // ━━━ FASE 1: Quem e voce ━━━
    onboardingPhase(1, "Quem e voce", TOTAL_PHASES);
    onboardingHint("Precisamos saber seu nome para personalizar tudo. Seu contato para servicos externos.");
    onboardingQuestion("Qual e o seu nome?");
    data.userName = (await terminal.question("  -> ")).trim();
    if (data.userName) onboardingInfo(`Prazer, ${data.userName}!\n`);

    onboardingQuestion("Seu e-mail (para contato e login em servicos)?");
    data.userEmail = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Seu WhatsApp (com DDD)?");
    data.userPhone = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Seu Instagram (se tiver)?");
    data.userInstagram = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Onde voce esta? (cidade/estado)");
    data.userLocation = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 2: Seu negocio ━━━
    onboardingPhase(2, "Seu negocio", TOTAL_PHASES);
    onboardingHint("Essas informacoes definem o contexto do projeto e sao usadas pela IA para tomar decisoes de design e conteudo.");
    onboardingQuestion("Qual e o nome do seu negocio/empresa?");
    data.businessName = (await terminal.question("  -> ")).trim();
    if (data.businessName) onboardingInfo(`Negocio: ${data.businessName}\n`);

    onboardingQuestion("Em que area/industria voce atua? (ex: consultoria, e-commerce, educacao, saude)");
    data.businessIndustry = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Descreva seu negocio em 2-3 frases: o que faz, como ajuda, por que existe.");
    data.businessDescription = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Ha quanto tempo seu negocio existe?");
    data.businessAge = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual o porte? (1 pessoa / pequena equipe 2-5 / media 6-20 / grande 20+)");
    data.businessSize = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Onde fica seu negocio? (cidade/estado ou 'online/100% digital')");
    data.businessLocation = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Voce ja tem site? Se sim, qual a URL?");
    data.businessWebsite = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais redes sociais o negocio usa? (ex: @instagram, facebook.com/perfil)");
    data.businessSocial = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 3: Objetivos e visao ━━━
    onboardingPhase(3, "Objetivos e visao", TOTAL_PHASES);
    onboardingHint("Essas informacoes guiam a estrategia do projeto. A IA usa para definir CTAs, copy e hierarquia de conteudo.");
    onboardingQuestion("Qual e o principal objetivo do seu negocio agora? (ex: aumentar vendas, captar leads, fortalecer marca)");
    data.mainGoal = (await terminal.question("  -> ")).trim();

    onboardingQuestion("O que voce quer alcancar com um projeto digital? (ex: vender online, mostrar portfolio, automatizar atendimento)");
    data.digitalGoal = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual e o maior desafio do seu negocio hoje?");
    data.mainChallenge = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Onde voce se ve daqui 1 ano com o projeto certo?");
    data.visionOneYear = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Como voce vai medir se o projeto deu certo? (ex: vendas, contatos, engajamento)");
    data.successMetric = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 4: Publico-alvo ━━━
    onboardingPhase(4, "Publico-alvo", TOTAL_PHASES);
    onboardingHint("Conhecer o publico e essencial para a skill de design recomendar o estilo visual, paleta de cores e tipografia corretos.");
    onboardingQuestion("Quem e seu cliente ideal? (descreva em 1-2 frases)");
    data.targetAudience = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual a faixa etaria do seu publico? (ex: 25-40 anos)");
    data.audienceAge = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Genero predominante? (masculino / feminino / ambos / nao-binario / todos)");
    data.audienceGender = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Classe social / faixa de renda do publico? (classe A, B, C, misto)");
    data.audienceClass = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais sao as principais dores ou necessidades desse publico?");
    data.audiencePains = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Onde esse publico esta? (Instagram, Google, WhatsApp, eventos, etc.)");
    data.audienceWhere = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Como esse publico te encontra hoje? (indicacao, busca, anuncio, organico)");
    data.audienceFindYou = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 5: Modelo de negocio ━━━
    onboardingPhase(5, "Modelo de negocio", TOTAL_PHASES);
    onboardingHint("Entender como voce fatura ajuda a definir a estrutura do projeto: precificacao, checkout, funil de vendas.");
    onboardingQuestion("Como voce fatura? (por hora, por produto, assinatura, projeto, comissao)");
    data.revenueModel = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais sao seus principais produtos ou servicos?");
    data.mainProducts = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual a faixa de preco dos seus servicos/produtos?");
    data.priceRange = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual o ticket medio (valor medio por cliente)?");
    data.averageTicket = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quem sao seus principais concorrentes? (nomes ou URLs)");
    data.competitors = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual e o seu diferencial? Por que alguem escolhe voce e nao o concorrente?");
    data.differentiator = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 6: Projeto digital ━━━
    onboardingPhase(6, "Projeto digital", TOTAL_PHASES);
    onboardingHint("O tipo de projeto define qual template sera usado. Se nao souber, vou te ajudar a escolher.");

    console.log("  " + color("37", "Tipos de projeto disponiveis:\n"));
    console.log("  " + color("1;37", "1.") + " Site premium (landing page, institucional, portfolio)");
    console.log("  " + color("1;37", "2.") + " Aplicacao / dashboard (SaaS, sistema web, produto digital)");
    console.log("  " + color("1;37", "3.") + " Carrossel social editavel (Instagram / LinkedIn)");
    console.log("  " + color("1;37", "4.") + " CRM com WhatsApp (inbox, contatos, pipeline, automacoes)");
    console.log("  " + color("1;37", "5.") + " Ainda nao sei / me ajude a escolher\n");

    onboardingQuestion("Que tipo de projeto voce quer criar? [1-5]");
    const typeChoice = (await terminal.question("  -> ")).trim();
    const typeMap = { "1": "site", "2": "app", "3": "carousel", "4": "crm", "5": "auto" };
    data.projectType = typeMap[typeChoice] || normalizeType(typeChoice) || "auto";

    if (data.projectType === "auto") {
      console.log();
      console.log("  " + color("36", "Sem problemas! Vou te ajudar a escolher.\n"));

      onboardingQuestion("Voce quer vender algo online, mostrar seu trabalho ou gerenciar clientes?");
      const intent = (await terminal.question("  -> ")).trim().toLowerCase();

      if (/vend|produt|loja|e-commerce|compr/.test(intent)) {
        data.projectType = "app";
        console.log("  " + color("36", "-> Uma aplicacao/dashboard seria ideal para vender online.\n"));
      } else if (/mostr|portfolio|institucional|landing|pagina/.test(intent)) {
        data.projectType = "site";
        console.log("  " + color("36", "-> Um site premium seria perfeito para mostrar seu trabalho.\n"));
      } else if (/client|relacionamento|whatsapp|vendas|funil|crm|pipeline/.test(intent)) {
        data.projectType = "crm";
        console.log("  " + color("36", "-> Um CRM com WhatsApp seria ideal para gerenciar seus clientes.\n"));
      } else if (/social|instagram|carrossel|conteudo|post/.test(intent)) {
        data.projectType = "carousel";
        console.log("  " + color("36", "-> Um estudo de carrossel seria perfeito para criar conteudo.\n"));
      } else {
        data.projectType = "site";
        console.log("  " + color("36", "-> Comecando com um site premium, que e versatil e rapido de lancar.\n"));
      }
    }

    const typeLabel = { site: "Site premium", app: "Aplicacao", carousel: "Carrossel", crm: "CRM com WhatsApp" }[data.projectType] || "Projeto";
    onboardingInfo(`Tipo selecionado: ${typeLabel}\n`);

    onboardingQuestion("Qual o nome do projeto?");
    data.projectName = (await terminal.question("  -> ")).trim();
    if (!data.projectName) data.projectName = data.businessName;

    onboardingQuestion("Qual o objetivo principal do projeto? (ex: captar clientes, vender produto X, automatizar atendimento)");
    data.projectObjective = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais funcionalidades sao essenciais na primeira versao? (liste separado por virgula)");
    data.projectFeatures = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais paginas ou secoes o projeto precisa? (ex: home, sobre, servicos, blog, contato)");
    data.projectPages = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Tem algum site/app que admira como referencia? (URL ou nome)");
    data.projectReferences = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Precisa de alguma integracao? (ex: Supabase, WhatsApp API, Stripe, pagamento, e-mail)");
    data.projectIntegrations = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Alguma restricao tecnica? (ex: nao usar frameworks especificos, manter custo zero)");
    data.projectConstraints = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 7: Identidade visual ━━━
    onboardingPhase(7, "Identidade visual", TOTAL_PHASES);
    onboardingHint("Essas informacoes sao cruzadas com a skill ui-ux-pro-max para gerar recomendacoes de design personalizadas.");
    onboardingQuestion("Qual nome a marca vai usar? (pode ser diferente do nome do negocio)");
    data.brandName = (await terminal.question("  -> ")).trim();
    if (!data.brandName) data.brandName = data.businessName;

    onboardingQuestion("Qual o tom de voz da marca? (ex: profissional, informal, ousado, acolhedor, tecnico)");
    data.brandTone = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Se a marca fosse uma pessoa, como voce a descreveria? (ex: confiante, moderna, acessivel)");
    data.brandPersonality = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais cores a marca usa? (ex: azul e branco, preto e dourado)");
    data.brandColors = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Cor de destaque em hex (ex: #ff5a1f) ou Enter para usar o padrao:");
    data.brandAccent = (await terminal.question("  -> ")).trim() || "#ff5a1f";
    try {
      data.brandAccent = normalizeHexColor(data.brandAccent);
    } catch {
      data.brandAccent = "#ff5a1f";
    }

    onboardingQuestion("Ja tem logo? (sim/nao/caminho do arquivo)");
    data.hasLogo = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Ja tem favicon? (sim/nao/caminho do arquivo)");
    data.hasFavicon = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Alguma referencia visual? (sites, cores, estilos que gosta)");
    data.visualReferences = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 8: Aspectos tecnicos ━━━
    onboardingPhase(8, "Aspectos tecnicos", TOTAL_PHASES);
    onboardingHint("Informacoes tecnicas ajudam a configurar o projeto corretamente desde o inicio.");
    onboardingQuestion("Ja tem hospedagem? (ex: Vercel, Netlify, AWS, servidor proprio)");
    data.currentHosting = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Ja tem dominio registrado? (ex: meusite.com.br)");
    data.domain = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Usa alguma plataforma hoje? (ex: WordPress, Wix, Shopify)");
    data.currentPlatform = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Precisa de SEO otimizado? [S/n]");
    data.needsSEO = (await terminal.question("  -> ")).trim();
    if (!data.needsSEO || data.needsSEO.toLowerCase() === "s") data.needsSEO = "Sim";
    else data.needsSEO = "Nao";

    onboardingQuestion("Precisa de analytics/rastreamento? [S/n]");
    data.needsAnalytics = (await terminal.question("  -> ")).trim();
    if (!data.needsAnalytics || data.needsAnalytics.toLowerCase() === "s") data.needsAnalytics = "Sim";
    else data.needsAnalytics = "Nao";

    onboardingQuestion("Em quais idiomas o projeto precisa? (ex: portugues, ingles, espanhol)");
    data.languages = (await terminal.question("  -> ")).trim() || "Portugues (pt-BR)";

    onboardingQuestion("Algum requisito de acessibilidade? (ex: WCAG 2.1, contraste alto, leitor de tela)");
    data.accessibility = (await terminal.question("  -> ")).trim() || "Padrao WCAG";

    onboardingSep();

    // ━━━ FASE 9: Presenca digital atual ━━━
    onboardingPhase(9, "Presenca digital", TOTAL_PHASES);
    onboardingHint("Entender sua presenca atual ajuda a definir o que integrar e o que criar do zero.");
    onboardingQuestion("Ja tem site funcionando? Se sim, qual URL?");
    data.hasWebsite = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quais redes sociais esta ativo? (ex: Instagram, TikTok, LinkedIn, Facebook)");
    data.activeSocialMedia = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Com que frequencia publica? (diario, semanal, mensal, esporadicamente)");
    data.postingFrequency = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Usa e-mail marketing? (ex: Mailchimp, RD Station, ActiveCampaign)");
    data.emailMarketing = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Ja tem lista de contatos/e-mails de clientes?");
    data.contactList = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Usa WhatsApp Business? (sim/nao)");
    data.whatsappBusiness = (await terminal.question("  -> ")).trim();

    onboardingSep();

    // ━━━ FASE 10: Proximos passos ━━━
    onboardingPhase(10, "Proximos passos", TOTAL_PHASES);
    onboardingHint("Essas informacoes definem a prioridade e o escopo do projeto.");
    onboardingQuestion("Qual a urgencia? (urgente essa semana / 1 mes / 3 meses / sem pressa)");
    data.urgency = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual o orcamento estimado para o projeto? (faixa ou 'sem definir')");
    data.budget = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Qual o prazo desejado para lancar?");
    data.deadline = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quem toma a decisao final no projeto? (voce / socio / investidor)");
    data.decisionMaker = (await terminal.question("  -> ")).trim() || "O proprio usuario";

    onboardingQuestion("Tem alguem com conhecimento tecnico na equipe? [S/n]");
    data.hasTechTeam = (await terminal.question("  -> ")).trim();

    onboardingQuestion("Quer gerenciar o projeto sozinho depois de pronto? [S/n]");
    data.selfManage = (await terminal.question("  -> ")).trim();
    if (!data.selfManage || data.selfManage.toLowerCase() === "s") data.selfManage = "Sim";
    else data.selfManage = "Nao";

    onboardingSep();

    // ━━━ DESIGN INTELIGENTE (usando skill ui-ux-pro-max) ━━━
    console.log();
    console.log(color("1;38;5;208", "  === BONUS: Design Inteligente ===\n"));
    onboardingInfo("Analisando suas respostas com a skill ui-ux-pro-max...\n");

    const designRecs = generateDesignRecommendations(data);

    if (designRecs.product) {
      console.log(color("1;37", "  Produto recomendado:"));
      console.log(color("37", `    Categoria: ${designRecs.product["Product Type"]}`));
      console.log(color("37", `    Estilo: ${designRecs.product["Primary Style Recommendation"]}`));
      console.log(color("37", `    Cores: ${designRecs.product["Color Palette Focus"]}`));
      console.log(color("37", `    Landing: ${designRecs.product["Landing Page Pattern"]}`));
      console.log(color("37", `    Dica: ${designRecs.product["Key Considerations"]}\n`));
    }

    if (designRecs.typography) {
      console.log(color("1;37", "  Tipografia recomendada:"));
      console.log(color("37", `    Par: ${designRecs.typography["Font Pairing Name"]}`));
      console.log(color("37", `    Titulo: ${designRecs.typography["Heading Font"]}`));
      console.log(color("37", `    Corpo: ${designRecs.typography["Body Font"]}`));
      console.log(color("37", `    Mood: ${designRecs.typography["Mood/Style Keywords"]}\n`));
    }

    if (designRecs.style) {
      console.log(color("1;37", "  Estilo visual:"));
      console.log(color("37", `    Categoria: ${designRecs.style["Style Category"]}`));
      console.log(color("37", `    Melhor para: ${designRecs.style["Best For"]}`));
      console.log(color("37", `    Performance: ${designRecs.style.Performance}`));
      console.log(color("37", `    Acessibilidade: ${designRecs.style.Accessibility}\n`));
    }

    if (designRecs.reasoning) {
      console.log(color("1;37", "  Regras por industria:"));
      console.log(color("37", `    Anti-padroes: ${designRecs.reasoning.Anti_Patterns}\n`));
    }

    // ━━━ SALVAR CONTEXTO ━━━
    console.log();
    console.log(color("1;38;5;208", "  === Salvando contexto ===\n"));

    const contextDir = join(process.cwd(), "_contexto");
    mkdirSync(contextDir, { recursive: true });

    const contextPath = join(contextDir, "onboarding.md");
    const contextContent = generateOnboardingContext(data);
    writeFileSync(contextPath, contextContent, "utf8");
    onboardingInfo(`Contexto salvo em: ${contextPath}`);

    if (designRecs.product || designRecs.typography || designRecs.style) {
      const designPath = join(contextDir, "design-recommendations.md");
      const designContent = generateDesignMarkdown(designRecs, data);
      writeFileSync(designPath, designContent, "utf8");
      onboardingInfo(`Recomendacoes de design salvas em: ${designPath}`);
    }

    const brandPath = join(contextDir, "brand-kit.md");
    const brandContent = generateBrandKitMarkdown(data);
    writeFileSync(brandPath, brandContent, "utf8");
    onboardingInfo(`Brand Kit salvo em: ${brandPath}\n`);

    // ━━━ RESUMO ━━━
    console.log();
    console.log(color("1;38;5;208", "  ╔══════════════════════════════════════════════════════════╗"));
    console.log(color("1;38;5;208", "  ║") + color("1;37", "                    RESUMO DO ONBOARDING                   ") + color("1;38;5;208", "  ║"));
    console.log(color("1;38;5;208", "  ╚══════════════════════════════════════════════════════════╝\n"));

    console.log(color("37", `  Usuario:      ${data.userName || "---"}`));
    console.log(color("37", `  Negocio:      ${data.businessName || "---"}`));
    console.log(color("37", `  Area:         ${data.businessIndustry || "---"}`));
    console.log(color("37", `  Objetivo:     ${data.mainGoal || "---"}`));
    console.log(color("37", `  Publico:      ${data.targetAudience || "---"}`));
    console.log(color("37", `  Projeto:      ${typeLabel} -- "${data.projectName || "---"}"`));
    console.log(color("37", `  Marca:        ${data.brandName || "---"}`));
    console.log(color("37", `  Cor:          ${data.brandAccent}`));
    console.log(color("37", `  Urgencia:     ${data.urgency || "---"}`));
    console.log(color("37", `  Orcamento:    ${data.budget || "---"}`));
    console.log();

    // ━━━ CRIAR PROJETO ━━━
    onboardingQuestion("Quer que eu crie o projeto agora com base nesse contexto? [S/n]");
    const shouldCreate = (await terminal.question("  -> ")).trim();

    if (!shouldCreate || shouldCreate.toLowerCase() === "s" || shouldCreate.toLowerCase() === "sim") {
      console.log();
      onboardingInfo("Perfeito! Criando seu projeto...\n");

      const resolvedType = normalizeType(data.projectType);
      if (!resolvedType || !data.projectName) {
        ui.warn("Nao foi possivel criar o projeto automaticamente. Use supermotor criar com os dados do onboarding.");
        console.log(`\n  Exemplo: supermotor criar ${data.projectType} "${data.projectName || "Nome do Projeto"}"`);
      } else {
        const slug = slugify(data.projectName);
        const destination = join(DEFAULT_OUTPUT, slug);

        if (existsSync(destination)) {
          ui.warn(`Ja existe um projeto com o nome "${data.projectName}" em projetos/${slug}`);
          console.log(`  Use supermotor criar ${resolvedType} "${data.projectName}" --saida <caminho>`);
        } else {
          const answers = {
            name: data.projectName,
            brief: data.projectObjective || "Criar uma experiencia digital memoravel, clara e orientada a resultado.",
            success: data.successMetric || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e validacao real.",
            essentials: data.projectFeatures || "Experiencia principal completa, estados de erro e vazio, responsividade e acessibilidade.",
            constraints: data.projectConstraints || "Preservar seguranca, desempenho, identidade da marca e compatibilidade mobile.",
            brandName: data.brandName || data.businessName || data.projectName,
            audience: data.targetAudience || DEFAULT_BRAND.audience,
            tone: data.brandTone || DEFAULT_BRAND.tone,
            accent: data.brandAccent || DEFAULT_BRAND.accent,
            favicon: data.hasFavicon && data.hasFavicon !== "nao" && data.hasFavicon !== "Nao" ? data.hasFavicon : "auto",
          };

          if (resolvedType === "crm") {
            const parsed = { positionals: ["criar", resolvedType, data.projectName], options: { rapido: false } };
            createCrmProject(destination, answers, slug, parsed);
          } else {
            ui.title(`Criando ${TYPES[resolvedType].label}`);
            ui.info(`Destino: ${destination}`);
            mkdirSync(destination, { recursive: true });

            const commonTemplate = join(TEMPLATE_ROOT, "common");
            const typeTemplate = join(TEMPLATE_ROOT, TYPES[resolvedType].template);
            if (existsSync(commonTemplate) && existsSync(typeTemplate)) {
              copyTemplate(commonTemplate, destination);
              copyTemplate(typeTemplate, destination);
              copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(destination, ".supermotor"));
              replaceTokens(destination, projectTokens(resolvedType, answers, slug));
              const faviconSource = createFavicon(destination, answers.favicon, answers.brandName, answers.accent);
              replaceTokens(destination, { FAVICON_SOURCE: faviconSource });
              initializeProjectTracking(destination, {
                projectType: resolvedType,
                name: data.projectName,
                objective: data.projectObjective,
                success: data.successMetric,
                essentials: data.projectFeatures,
                constraints: data.projectConstraints,
                brand: data.brandName || data.businessName,
                motorVersion: "3.0.0",
              });

              ui.ok("Starter e contexto de IA criados");
              ui.ok(`Favicon: ${faviconSource}`);
              npmInstall(destination);

              const displayPath = relative(process.cwd(), destination) || destination;
              console.log("\nPronto. Proximos passos:\n");
              console.log(`  cd "${displayPath}"`);
              console.log("  npm run dev");
              console.log("\nDepois, peca a IA:");
              console.log('  "Leia SUPERPROMPT.md, PRODUCT.md, CONVERSATION.md, BRAND.md, DESIGN.md e QUALITY.md. Registre seu andamento e execute o projeto ate passar em todos os criterios."');
              console.log(`\n${color("32", "Projeto criado com sucesso:")} ${destination}\n`);
            }
          }
        }
      }
    } else {
      console.log();
      console.log("  " + color("36", "Sem problemas! O contexto esta salvo em _contexto/onboarding.md"));
      console.log("  " + color("36", "Tambem foi gerado design-recommendations.md e brand-kit.md"));
      console.log("  " + color("36", "Quando quiser criar o projeto, use:"));
      console.log();
      console.log(`    supermotor criar ${data.projectType} "${data.projectName || "Nome do Projeto"}"`);
      console.log();
      console.log("  " + color("36", "Ou retome o onboarding a qualquer momento com:"));
      console.log("    supermotor onboarding\n");
    }

  } finally {
    terminal.close();
  }
}


function help() {
  console.log(`
SUPERMOTOR 3.0

Uso:
  supermotor onboarding
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

Comandos:
  onboarding    Assistente interativo que conhece você e seu negócio,
                depois sugere e cria o projeto ideal

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

  if (["onboarding", "onboard", "conhecer", "intro", "introducao", "introdução"].includes(command)) {
    await runOnboarding();
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
