import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { UUPM_DATA } from "./constants.mjs";

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
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower) || lower.includes(word)) score += 1;
  }
  return score;
}

export { parseCSVLine, readCSV, scoreMatch };
