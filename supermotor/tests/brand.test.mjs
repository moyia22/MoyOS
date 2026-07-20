import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { normalizeHexColor, mixWithWhite, readableTextColor, escapeXml, brandInitials, faviconMimeType, generateBrandKitMarkdown } from "../bin/lib/brand.mjs";

describe("normalizeHexColor", () => {
  it("normalizes 6-digit hex", () => {
    assert.equal(normalizeHexColor("#ff5a1f"), "#ff5a1f");
  });

  it("normalizes 3-digit hex", () => {
    assert.equal(normalizeHexColor("#f00"), "#ff0000");
    assert.equal(normalizeHexColor("#abc"), "#aabbcc");
  });

  it("lowercases uppercase hex", () => {
    assert.equal(normalizeHexColor("#FF5A1F"), "#ff5a1f");
  });

  it("uses default when empty", () => {
    assert.equal(normalizeHexColor(""), "#ff5a1f");
    assert.equal(normalizeHexColor(null), "#ff5a1f");
  });

  it("throws on invalid hex", () => {
    assert.throws(() => normalizeHexColor("not-a-color"), /hexadecimal/);
    assert.throws(() => normalizeHexColor("#gg0000"), /hexadecimal/);
    assert.throws(() => normalizeHexColor("rgb(255,0,0)"), /hexadecimal/);
  });
});

describe("mixWithWhite", () => {
  it("mixes a color toward white", () => {
    const result = mixWithWhite("#000000");
    assert.ok(result.startsWith("#"));
    assert.equal(result.length, 7);
    assert.notEqual(result, "#000000");
  });

  it("returns near-white for white input", () => {
    const result = mixWithWhite("#ffffff");
    assert.equal(result, "#ffffff");
  });

  it("produces lighter shade for accent", () => {
    const result = mixWithWhite("#ff5a1f");
    assert.ok(result !== "#ff5a1f");
    assert.ok(result.startsWith("#"));
  });
});

describe("readableTextColor", () => {
  it("returns dark text for light backgrounds", () => {
    assert.equal(readableTextColor("#ffffff"), "#11110f");
    assert.equal(readableTextColor("#f0f0f0"), "#11110f");
  });

  it("returns light text for dark backgrounds", () => {
    assert.equal(readableTextColor("#000000"), "#ffffff");
    assert.equal(readableTextColor("#11110f"), "#ffffff");
  });

  it("handles accent colors", () => {
    const result = readableTextColor("#ff5a1f");
    assert.ok(result === "#11110f" || result === "#ffffff");
  });
});

describe("escapeXml", () => {
  it("escapes special characters", () => {
    assert.equal(escapeXml("<div>"), "&lt;div&gt;");
    assert.equal(escapeXml('a & b'), "a &amp; b");
    assert.equal(escapeXml('"quoted"'), "&quot;quoted&quot;");
    assert.equal(escapeXml("it's"), "it&apos;s");
  });

  it("passes through normal text", () => {
    assert.equal(escapeXml("hello world"), "hello world");
  });
});

describe("brandInitials", () => {
  it("extracts first letter of single word", () => {
    assert.equal(brandInitials("Moyos"), "M");
  });

  it("extracts two letters from two words", () => {
    assert.equal(brandInitials("Moyos Labs"), "ML");
  });

  it("takes at most two initials", () => {
    assert.equal(brandInitials("Moyos Labs Digital"), "ML");
  });

  it("returns M for empty input", () => {
    assert.equal(brandInitials(""), "M");
  });

  it("uppercases result", () => {
    assert.equal(brandInitials("moyos labs"), "ML");
  });
});

describe("faviconMimeType", () => {
  it("returns correct MIME types", () => {
    assert.equal(faviconMimeType(".ico"), "image/x-icon");
    assert.equal(faviconMimeType(".png"), "image/png");
    assert.equal(faviconMimeType(".svg"), "image/svg+xml");
    assert.equal(faviconMimeType(".jpg"), "image/jpeg");
    assert.equal(faviconMimeType(".jpeg"), "image/jpeg");
  });

  it("defaults to image/png", () => {
    assert.equal(faviconMimeType(".webp"), "image/png");
    assert.equal(faviconMimeType(""), "image/png");
  });
});

describe("generateBrandKitMarkdown", () => {
  it("generates markdown with brand data", () => {
    const md = generateBrandKitMarkdown({
      brandName: "TestBrand",
      businessName: "TestBiz",
      businessIndustry: "Tech",
      targetAudience: "Developers",
      brandTone: "Professional",
      brandPersonality: "Modern",
      brandColors: "Blue and white",
      brandAccent: "#0066ff",
      hasLogo: "Sim",
      hasFavicon: "Sim",
      visualReferences: "Stripe",
    });
    assert.ok(md.includes("TestBrand"));
    assert.ok(md.includes("TestBiz"));
    assert.ok(md.includes("Tech"));
    assert.ok(md.includes("#0066ff"));
    assert.ok(md.includes("Brand Kit"));
  });

  it("handles missing data gracefully", () => {
    const md = generateBrandKitMarkdown({});
    assert.ok(md.includes("Brand Kit"));
    assert.ok(md.includes("---"));
  });
});
