import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { replaceTokens, replaceTokensInFile, collectFiles, projectTokens } from "../bin/lib/tokens.mjs";

function makeTmpDir(name) {
  const dir = join(tmpdir(), `sm-test-${name}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("replaceTokens", () => {
  it("replaces tokens in files recursively", () => {
    const dir = makeTmpDir("replace-tokens");
    const sub = join(dir, "sub");
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(dir, "a.txt"), "Hello __NAME__!", "utf8");
    writeFileSync(join(sub, "b.txt"), "Type: __TYPE__", "utf8");
    try {
      replaceTokens(dir, { NAME: "World", TYPE: "site" });
      assert.equal(readFileSync(join(dir, "a.txt"), "utf8"), "Hello World!");
      assert.equal(readFileSync(join(sub, "b.txt"), "utf8"), "Type: site");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips non-text files", () => {
    const dir = makeTmpDir("skip-binary");
    writeFileSync(join(dir, "data.bin"), Buffer.from([0xff, 0xd8]), "utf8");
    writeFileSync(join(dir, "text.txt"), "__TOKEN__", "utf8");
    try {
      replaceTokens(dir, { TOKEN: "replaced" });
      assert.equal(readFileSync(join(dir, "text.txt"), "utf8"), "replaced");
      const bin = readFileSync(join(dir, "data.bin"));
      assert.equal(bin[0], 0xff);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("replaceTokensInFile", () => {
  it("replaces tokens in a single file", () => {
    const dir = makeTmpDir("replace-single");
    const file = join(dir, "test.txt");
    writeFileSync(file, "__PROJECT_NAME__ by __BRAND_NAME__", "utf8");
    try {
      replaceTokensInFile(file, { PROJECT_NAME: "MyApp", BRAND_NAME: "Acme" });
      assert.equal(readFileSync(file, "utf8"), "MyApp by Acme");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("collectFiles", () => {
  it("collects all files recursively", () => {
    const dir = makeTmpDir("collect-files");
    const sub = join(dir, "sub");
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(dir, "a.txt"), "a", "utf8");
    writeFileSync(join(sub, "b.txt"), "b", "utf8");
    try {
      const files = collectFiles(dir);
      assert.equal(files.length, 2);
      assert.ok(files.some((f) => f.endsWith("a.txt")));
      assert.ok(files.some((f) => f.endsWith("b.txt")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty array for non-existent dir", () => {
    assert.deepEqual(collectFiles("/nonexistent/path"), []);
  });
});

describe("projectTokens", () => {
  it("generates all required tokens", () => {
    const tokens = projectTokens("site", {
      name: "My Project",
      brief: "A brief",
      success: "Success metric",
      essentials: "Features",
      constraints: "Limits",
      brandName: "MyBrand",
      audience: "People",
      tone: "Bold",
      accent: "#ff0000",
    }, "my-project");
    assert.equal(tokens.PROJECT_NAME, "My Project");
    assert.equal(tokens.PROJECT_SLUG, "my-project");
    assert.equal(tokens.PROJECT_TYPE, "Site premium");
    assert.equal(tokens.BRAND_NAME, "MyBrand");
    assert.equal(tokens.BRAND_ACCENT, "#ff0000");
    assert.equal(tokens.BRAND_ACCENT_SOFT, "#ffc7c7");
    assert.equal(tokens.BRAND_ACCENT_TEXT, "#ffffff");
    assert.equal(tokens.BRAND_INITIAL, "M");
    assert.equal(tokens.PROJECT_LANG, "pt-BR");
    assert.ok(tokens.CREATED_DATE);
  });

  it("uses lang from answers when provided", () => {
    const tokens = projectTokens("app", {
      name: "Test",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "Brand",
      audience: "a",
      tone: "t",
      accent: "#000000",
      lang: "en-US",
    }, "test");
    assert.equal(tokens.PROJECT_LANG, "en-US");
  });

  it("extracts multi-word initials", () => {
    const tokens = projectTokens("site", {
      name: "Test",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "Labs Digital",
      audience: "a",
      tone: "t",
      accent: "#000000",
    }, "test");
    assert.equal(tokens.BRAND_INITIAL, "LD");
  });

  it("merges extra tokens", () => {
    const tokens = projectTokens("site", {
      name: "Test",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "Brand",
      audience: "a",
      tone: "t",
      accent: "#000000",
    }, "test", { CUSTOM: "value" });
    assert.equal(tokens.CUSTOM, "value");
  });

  it("handles emoji in brand name", () => {
    const tokens = projectTokens("site", {
      name: "Test",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "🚀 Rocket Labs",
      audience: "a",
      tone: "t",
      accent: "#000000",
    }, "test");
    assert.equal(tokens.BRAND_NAME, "🚀 Rocket Labs");
    assert.ok(tokens.BRAND_INITIAL);
  });

  it("handles emoji in project name", () => {
    const tokens = projectTokens("app", {
      name: "🍕 Pizza App",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "Brand",
      audience: "a",
      tone: "t",
      accent: "#000000",
    }, "pizza-app");
    assert.equal(tokens.PROJECT_NAME, "🍕 Pizza App");
  });

  it("handles empty accent color", () => {
    const tokens = projectTokens("site", {
      name: "Test",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "Brand",
      audience: "a",
      tone: "t",
      accent: "",
    }, "test");
    assert.equal(typeof tokens.BRAND_ACCENT, "string");
  });

  it("handles special characters in slug", () => {
    const tokens = projectTokens("site", {
      name: "Test",
      brief: "b",
      success: "s",
      essentials: "e",
      constraints: "c",
      brandName: "Brand",
      audience: "a",
      tone: "t",
      accent: "#000000",
    }, "my-project_v2.0");
    assert.equal(tokens.PROJECT_SLUG, "my-project_v2.0");
  });
});
