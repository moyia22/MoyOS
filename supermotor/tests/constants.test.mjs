import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeType, slugify, TYPES, TEXT_EXTENSIONS, DEFAULT_BRAND } from "../bin/lib/constants.mjs";

describe("normalizeType", () => {
  it("normalizes site types", () => {
    assert.equal(normalizeType("site"), "site");
    assert.equal(normalizeType("landing"), "site");
    assert.equal(normalizeType("landing-page"), "site");
    assert.equal(normalizeType("website"), "site");
  });

  it("normalizes app types", () => {
    assert.equal(normalizeType("app"), "app");
    assert.equal(normalizeType("aplicacao"), "app");
    assert.equal(normalizeType("dashboard"), "app");
    assert.equal(normalizeType("sistema"), "app");
  });

  it("normalizes carousel types", () => {
    assert.equal(normalizeType("carousel"), "carousel");
    assert.equal(normalizeType("carrossel"), "carousel");
    assert.equal(normalizeType("social"), "carousel");
  });

  it("normalizes crm types", () => {
    assert.equal(normalizeType("crm"), "crm");
    assert.equal(normalizeType("wacrm"), "crm");
    assert.equal(normalizeType("vendas"), "crm");
    assert.equal(normalizeType("clientes"), "crm");
  });

  it("returns undefined for unknown types", () => {
    assert.equal(normalizeType("unknown"), undefined);
    assert.equal(normalizeType(""), undefined);
    assert.equal(normalizeType(null), undefined);
  });

  it("is case insensitive", () => {
    assert.equal(normalizeType("SITE"), "site");
    assert.equal(normalizeType("App"), "app");
    assert.equal(normalizeType("CRM"), "crm");
  });
});

describe("slugify", () => {
  it("creates valid slugs from simple names", () => {
    assert.equal(slugify("My Project"), "my-project");
    assert.equal(slugify("Hello World"), "hello-world");
  });

  it("removes accents", () => {
    assert.equal(slugify("Projeto de Teste"), "projeto-de-teste");
    assert.equal(slugify("Ação de Vendas"), "acao-de-vendas");
  });

  it("removes special characters", () => {
    assert.equal(slugify("Hello! @World#"), "hello-world");
    assert.equal(slugify("test@example.com"), "test-example-com");
  });

  it("trims to 64 characters", () => {
    const long = "a".repeat(100);
    assert.equal(slugify(long).length, 64);
  });

  it("handles empty input", () => {
    assert.equal(slugify(""), "");
  });

  it("lowercases", () => {
    assert.equal(slugify("MY PROJECT"), "my-project");
  });
});

describe("TYPES", () => {
  it("has all required types", () => {
    assert.ok(TYPES.site);
    assert.ok(TYPES.app);
    assert.ok(TYPES.carousel);
    assert.ok(TYPES.crm);
  });

  it("each type has required fields", () => {
    for (const [key, config] of Object.entries(TYPES)) {
      assert.ok(config.label, `${key} missing label`);
      assert.ok(config.template, `${key} missing template`);
      assert.ok(config.description, `${key} missing description`);
      assert.ok(Array.isArray(config.aliases), `${key} missing aliases`);
    }
  });
});

describe("TEXT_EXTENSIONS", () => {
  it("includes common text extensions", () => {
    assert.ok(TEXT_EXTENSIONS.has(".js"));
    assert.ok(TEXT_EXTENSIONS.has(".ts"));
    assert.ok(TEXT_EXTENSIONS.has(".tsx"));
    assert.ok(TEXT_EXTENSIONS.has(".css"));
    assert.ok(TEXT_EXTENSIONS.has(".md"));
    assert.ok(TEXT_EXTENSIONS.has(".json"));
    assert.ok(TEXT_EXTENSIONS.has(".html"));
  });

  it("excludes binary extensions", () => {
    assert.ok(!TEXT_EXTENSIONS.has(".png"));
    assert.ok(!TEXT_EXTENSIONS.has(".jpg"));
    assert.ok(!TEXT_EXTENSIONS.has(".ico"));
  });
});

describe("DEFAULT_BRAND", () => {
  it("has required fields", () => {
    assert.ok(DEFAULT_BRAND.audience);
    assert.ok(DEFAULT_BRAND.tone);
    assert.ok(DEFAULT_BRAND.accent);
    assert.ok(DEFAULT_BRAND.accent.startsWith("#"));
  });
});
