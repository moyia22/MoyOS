import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCSVLine, scoreMatch } from "../bin/lib/csv.mjs";

describe("parseCSVLine", () => {
  it("parses simple comma-separated values", () => {
    assert.deepEqual(parseCSVLine("a,b,c"), ["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    assert.deepEqual(parseCSVLine('"hello, world",b,c'), ["hello, world", "b", "c"]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    assert.deepEqual(parseCSVLine('"a""b",c'), ['a"b', "c"]);
  });

  it("trims whitespace", () => {
    assert.deepEqual(parseCSVLine(" a , b , c "), ["a", "b", "c"]);
  });

  it("handles empty fields", () => {
    assert.deepEqual(parseCSVLine("a,,c"), ["a", "", "c"]);
  });

  it("handles single field", () => {
    assert.deepEqual(parseCSVLine("only"), ["only"]);
  });

  it("handles empty string", () => {
    assert.deepEqual(parseCSVLine(""), [""]);
  });
});

describe("scoreMatch", () => {
  it("scores exact word matches", () => {
    assert.equal(scoreMatch("landing page moderna", "landing"), 1);
  });

  it("scores multiple keyword matches", () => {
    assert.equal(scoreMatch("saas dashboard cloud", "saas dashboard"), 2);
  });

  it("returns 0 for no matches", () => {
    assert.equal(scoreMatch("landing page", "saas"), 0);
  });

  it("returns 0 for empty inputs", () => {
    assert.equal(scoreMatch("", "test"), 0);
    assert.equal(scoreMatch("test", ""), 0);
    assert.equal(scoreMatch(null, "test"), 0);
    assert.equal(scoreMatch("test", null), 0);
  });

  it("is case insensitive", () => {
    assert.equal(scoreMatch("LANDING PAGE", "landing"), 1);
    assert.equal(scoreMatch("Landing Page", "LANDING"), 1);
  });

  it("handles comma-separated keywords", () => {
    assert.equal(scoreMatch("saas app", "saas,app"), 2);
  });

  it("handles special regex characters in keywords", () => {
    assert.equal(scoreMatch("c++ developer", "c++"), 1);
  });

  it("handles BOM in input", () => {
    assert.deepEqual(parseCSVLine("\uFEFFname,age"), ["name", "age"]);
  });

  it("handles unicode characters", () => {
    assert.deepEqual(parseCSVLine("nome,idade, profissão"), ["nome", "idade", "profissão"]);
  });

  it("handles very long fields", () => {
    const long = "a".repeat(10000);
    const result = parseCSVLine(`${long},b`);
    assert.equal(result[0].length, 10000);
    assert.equal(result[1], "b");
  });

  it("handles newlines in quoted fields", () => {
    assert.deepEqual(parseCSVLine('"line1\nline2",b'), ["line1\nline2", "b"]);
  });

  it("handles multiple escaped quotes", () => {
    assert.deepEqual(parseCSVLine('"a""b""c"'), ['a"b"c']);
  });
});
