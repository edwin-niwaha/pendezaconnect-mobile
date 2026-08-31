const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { URL } = require("node:url");
const { test } = require("node:test");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../src/features/notifications/workQueueLinks.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, URL };
vm.runInNewContext(compiled, context);
const { workQueueWebUrl } = context.exports;

test("review links use the API origin, not the API path", () => {
  assert.equal(workQueueWebUrl("https://example.org/api/v1", "/profile/update/42"), "https://example.org/profile/update/42");
  assert.equal(workQueueWebUrl("http://localhost:8000/api/v1", "/feedback/"), "http://localhost:8000/feedback/");
});

test("reject external hosts, absolute URLs, scripts, and backslash host escapes", () => {
  for (const target of ["https://evil.example/review", "//evil.example/review", "/\\evil.example/review", "javascript:alert(1)", "feedback/"]) {
    assert.throws(() => workQueueWebUrl("https://example.org/api/v1", target));
  }
});
