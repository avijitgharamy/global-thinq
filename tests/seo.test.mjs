import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/seo-page.mjs";
test("social crawler metadata is rendered from published CMS content and escaped", async () => {
  process.env.VITE_SUPABASE_URL = "https://project.supabase.co";
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "public-test";
  const old = fetch;
  global.fetch = async (url) => {
    if (String(url).endsWith("/index.html"))
      return new Response(
        '<html><head><title>Old</title><meta name="description" content="old"></head><body></body></html>',
      );
    assert(String(url).includes("published=eq.true"));
    return Response.json([
      {
        title: "A <script> & B",
        meta_description: "Description",
        og_image: "test.webp",
      },
    ]);
  };
  try {
    const r = await handler(new Request("https://example.com/blog/hello"));
    const text = await r.text();
    assert(text.includes("A &lt;script&gt; &amp; B"));
    assert(text.includes("og:image"));
    assert(
      text.includes(
        "https://project.supabase.co/storage/v1/object/public/media/test.webp",
      ),
    );
    assert(!text.includes('content="old"'));
  } finally {
    global.fetch = old;
  }
});
