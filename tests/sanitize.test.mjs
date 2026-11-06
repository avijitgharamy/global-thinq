import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM("");
global.window = dom.window;
const { clean } = await import("../src/sanitize.js");
test("stored HTML cannot execute scripts, event handlers or javascript URLs", () => {
  const html = clean(
    '<p onclick="alert(1)">Hi<strong>there</strong></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">Click</a><iframe src="https://evil.test"></iframe>',
  );
  assert(!/onclick|script|onerror|iframe|javascript:/.test(html));
  assert(html.includes("<strong>there</strong>"));
});
test("safe formatting and https links survive", () => {
  assert.equal(
    clean('<h2>Title</h2><p><a href="https://example.com">Example</a></p>'),
    '<h2>Title</h2><p><a href="https://example.com">Example</a></p>',
  );
});
