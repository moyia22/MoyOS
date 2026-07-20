import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEXT_EXTENSIONS, TYPES } from "./constants.mjs";
import { mixWithWhite, readableTextColor } from "./brand.mjs";

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

export { replaceTokens, replaceTokensInFile, collectFiles, projectTokens };
