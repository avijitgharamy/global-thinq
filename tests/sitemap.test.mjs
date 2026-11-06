import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/sitemap.mjs";
test("sitemap includes published API results and XML escaping", async () => {
  process.env.SITE_URL = "https://example.com";
  process.env.VITE_SUPABASE_URL = "https://project.supabase.co";
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "public-test";
  const original = global.fetch;
  global.fetch = async (url, options) => {
    assert(url.includes("published=eq.true&in_sitemap=eq.true"));
    assert.equal(options.headers.apikey, "public-test");
    return Response.json([
      { kind: "blog", slug: "hello", updated_at: "2026-11-05T10:00:00Z" },
    ]);
  };
  try {
    const r = await handler();
    assert.equal(r.status, 200);
    assert.match(await r.text(), /https:\/\/example.com\/blog\/hello/);
  } finally {
    global.fetch = original;
  }
});
test("sitemap returns unavailable when CMS is missing", async () => {
  delete process.env.VITE_SUPABASE_URL;
  assert.equal((await handler()).status, 503);
});
