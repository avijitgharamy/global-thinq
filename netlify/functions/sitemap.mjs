export default async () => {
  const origin = process.env.URL || process.env.SITE_URL;
  if (!origin) return new Response("Set SITE_URL", { status: 503 });
  const url = process.env.VITE_SUPABASE_URL,
    key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return new Response("CMS is not configured", { status: 503 });
  const response = await fetch(
    `${url}/rest/v1/content?select=kind,slug,updated_at&published=eq.true&in_sitemap=eq.true`,
    { headers: { apikey: key } },
  );
  if (!response.ok) return new Response("Sitemap unavailable", { status: 503 });
  const rows = await response.json();
  const escape = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const paths = [
    { path: "/", date: null },
    { path: "/blog", date: null },
    ...rows.map((x) => ({
      path: `/${{ blog: "blog", service: "services", portfolio: "portfolio" }[x.kind]}/${x.slug}`,
      date: x.updated_at,
    })),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((x) => `<url><loc>${escape(new URL(x.path, origin).href)}</loc>${x.date ? `<lastmod>${escape(x.date)}</lastmod>` : ""}</url>`).join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
};
