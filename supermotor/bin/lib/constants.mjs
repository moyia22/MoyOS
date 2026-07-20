import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname;

const ROOT = resolve(__dirname, "..", "..");
const TEMPLATE_ROOT = join(ROOT, "templates");
const DEFAULT_OUTPUT = join(ROOT, "projetos");
const WACRM_REPOSITORY = "https://github.com/ArnasDon/wacrm.git";
const WACRM_STABLE_REF = "main";
const SKILLS_ROOT = join(ROOT, "skills");
const UUPM_DATA = join(SKILLS_ROOT, "ui-ux-pro-max", "src", "ui-ux-pro-max", "data");
const BRAND_SKILLS_ROOT = join(SKILLS_ROOT, "awesome-design-md", "design-md");

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
    description: "site de marketing, institucional, portf\u00f3lio ou landing page",
  },
  app: {
    aliases: ["app", "aplicacao", "aplica\u00e7\u00e3o", "dashboard", "sistema"],
    label: "Aplica\u00e7\u00e3o",
    template: "application",
    description: "produto digital, SaaS, dashboard ou sistema web",
  },
  carousel: {
    aliases: ["carousel", "carrossel", "carross\u00e9is", "carrosseis", "social"],
    label: "Est\u00fadio de carrossel",
    template: "carousel",
    description: "carrossel para Instagram ou LinkedIn com editor e exporta\u00e7\u00e3o",
  },
  crm: {
    aliases: ["crm", "wacrm", "vendas", "clientes", "relacionamento", "funil", "pipeline", "sales", "whatsapp-crm", "gestao-de-clientes", "gest\u00e3o-de-clientes"],
    label: "CRM com WhatsApp",
    template: "crm",
    description: "CRM completo com WhatsApp integrado \u2014 inbox compartilhado, contatos, pipeline Kanban, broadcasts e automa\u00e7\u00f5es no-code",
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

export {
  ROOT,
  TEMPLATE_ROOT,
  DEFAULT_OUTPUT,
  WACRM_REPOSITORY,
  WACRM_STABLE_REF,
  SKILLS_ROOT,
  UUPM_DATA,
  BRAND_SKILLS_ROOT,
  DEFAULT_BRAND,
  ICON_EXTENSIONS,
  TYPES,
  TEXT_EXTENSIONS,
  normalizeType,
  slugify,
};
