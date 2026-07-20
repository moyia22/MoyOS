import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { DEFAULT_BRAND, ICON_EXTENSIONS, BRAND_SKILLS_ROOT } from "./constants.mjs";

function normalizeHexColor(value) {
  const c = String(value || DEFAULT_BRAND.accent).trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(c)) {
    return `#${c.slice(1).split("").map((ch) => ch.repeat(2)).join("")}`;
  }
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
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
  if (!option || ["auto", "automatico", "autom\u00e1tico"].includes(option.toLowerCase())) return;

  const source = resolve(process.cwd(), option);
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`Favicon nao encontrado: ${source}\nDica: verifique se o caminho esta correto e o arquivo existe.`);
  }
  if (!ICON_EXTENSIONS.has(extname(source).toLowerCase())) {
    throw new Error("Favicon inv\u00e1lido. Use .ico, .png, .jpg, .jpeg ou .svg.");
  }
}

function createFavicon(destination, faviconOption, brandName, accent) {
  const appDirectory = join(destination, "src", "app");
  const option = String(faviconOption || "auto").trim().replace(/^['"]|['"]$/g, "");

  if (option && !["auto", "automatico", "autom\u00e1tico"].includes(option.toLowerCase())) {
    const source = resolve(process.cwd(), option);
    if (!existsSync(source) || !statSync(source).isFile()) {
      throw new Error(`Favicon nao encontrado: ${source}\nDica: verifique se o caminho esta correto e o arquivo existe.`);
    }

    const extension = extname(source).toLowerCase();
    if (!ICON_EXTENSIONS.has(extension)) {
      throw new Error("Favicon inv\u00e1lido. Use .ico, .png, .jpg, .jpeg ou .svg.");
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

  if (option && !["auto", "automatico", "autom\u00e1tico"].includes(option.toLowerCase())) {
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

function findBrandReferences(industry, productType, tone) {
  if (!existsSync(BRAND_SKILLS_ROOT)) return [];
  const searchText = [industry, productType, tone].filter(Boolean).join(" ").toLowerCase();
  const brands = [];

  const brandMap = {
    saas: ["linear", "notion", "vercel", "resend", "cal"],
    microsaas: ["raycast", "lovable", "resend"],
    "e-commerce": ["nike", "shopify", "airbnb", "starbucks"],
    "luxury ecommerce": ["nike", "ferrari", "lamborghini"],
    "b2b service": ["stripe", "intercom", "zapier"],
    fintech: ["stripe", "wise", "coinbase", "revolut"],
    crypto: ["coinbase", "binance", "kraken"],
    creative: ["figma", "framer", "spotify", "webflow"],
    developer: ["cursor", "vercel", "supabase", "warp"],
    healthcare: ["notion", "stripe"],
    education: ["notion", "spotify", "mintlify"],
    media: ["spotify", "pinterest", "theverge", "wired"],
    automotive: ["tesla", "bmw", "ferrari"],
    enterprise: ["ibm", "hashicorp", "sentry"],
    social: ["pinterest", "airbnb", "figma"],
  };

  for (const [key, refs] of Object.entries(brandMap)) {
    if (searchText.includes(key) || key.split(" ").every((w) => searchText.includes(w))) {
      brands.push(...refs);
      break;
    }
  }

  if (!brands.length) {
    if (/saas|app|sistema|dashboard|cloud/.test(searchText)) brands.push("linear", "notion", "vercel");
    else if (/loja|produt|vend|shop/.test(searchText)) brands.push("shopify", "nike", "airbnb");
    else if (/consult|servic|agenc|profission/.test(searchText)) brands.push("stripe", "intercom", "cal");
    else if (/design|criativ|fotogr|art/.test(searchText)) brands.push("figma", "framer", "spotify");
    else if (/tech|dev|code|software/.test(searchText)) brands.push("cursor", "vercel", "supabase");
    else brands.push("notion", "stripe", "vercel");
  }

  const unique = [...new Set(brands)].slice(0, 4);
  return unique.filter((name) => existsSync(join(BRAND_SKILLS_ROOT, name, "DESIGN.md"))).map((name) => {
    const content = readFileSync(join(BRAND_SKILLS_ROOT, name, "DESIGN.md"), "utf8").slice(0, 3000);
    const descMatch = content.match(/description:\s*(.+)/i);
    const colorMatch = content.match(/primary:\s*["']?(#[0-9a-f]{6})["']?/i);
    return { name, description: descMatch?.[1]?.trim() || "", primaryColor: colorMatch?.[1] || "" };
  });
}

function generateBrandKitMarkdown(data) {
  const lines = [];
  lines.push("# Brand Kit \u2014 Identidade Visual");
  lines.push(`> Gerado pelo SUPERMOTOR 3.0\n`);

  lines.push("## Informa\u00e7\u00f5es da Marca\n");
  lines.push(`- **Nome:** ${data.brandName || data.businessName || "\u2014"}`);
  lines.push(`- **Neg\u00f3cio:** ${data.businessName || "\u2014"}`);
  lines.push(`- **\u00c1rea:** ${data.businessIndustry || "\u2014"}`);
  lines.push(`- **P\u00fablico:** ${data.targetAudience || "\u2014"}`);
  lines.push("");

  lines.push("## Personalidade\n");
  lines.push(`- **Tom de voz:** ${data.brandTone || "\u2014"}`);
  lines.push(`- **Personalidade:** ${data.brandPersonality || "\u2014"}`);
  lines.push(`- **Cores preferidas:** ${data.brandColors || "\u2014"}`);
  lines.push("");

  lines.push("## Paleta de Cores\n");
  lines.push(`- **Cor de destaque:** ${data.brandAccent || "#ff5a1f"}`);
  lines.push("");

  lines.push("## Ativos\n");
  lines.push(`- **Logo:** ${data.hasLogo || "N\u00e3o"}`);
  lines.push(`- **Favicon:** ${data.hasFavicon || "N\u00e3o"}`);
  lines.push(`- **Refer\u00eancias visuais:** ${data.visualReferences || "Nenhuma"}`);
  lines.push("");

  lines.push("---");
  lines.push("> Brand Kit completo. Use como refer\u00eancia para criar BRAND.md e DESIGN.md.\n");

  return lines.join("\n");
}

export {
  normalizeHexColor,
  mixWithWhite,
  readableTextColor,
  escapeXml,
  brandInitials,
  validateFaviconInput,
  createFavicon,
  faviconMimeType,
  patchWacrmCss,
  createCrmFavicon,
  findBrandReferences,
  generateBrandKitMarkdown,
};
