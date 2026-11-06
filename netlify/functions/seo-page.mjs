const escape = (s) =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export default async (req) => {
  const address = new URL(req.url),
    base = await fetch(new URL("/index.html", address));
  let html = await base.text();
  const url = process.env.VITE_SUPABASE_URL,
    key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  try {
    const [section, slug] = address.pathname.split("/").filter(Boolean);
    const kind = { blog: "blog", services: "service", portfolio: "portfolio" }[
      section
    ];
    const query = !section
      ? "/rest/v1/site_settings?id=eq.main&select=data"
      : kind && slug
        ? `/rest/v1/content?kind=eq.${kind}&slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=title,description,seo_title,meta_description,og_title,og_description,og_image,image_path`
        : null;
    if (!query)
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    const r = await fetch(url + query, { headers: { apikey: key } });
    if (!r.ok) throw new Error("Content unavailable");
    const rows = await r.json();
    if (!rows.length)
      return new Response(html, {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    const m = section ? rows[0] : rows[0].data.seo;
    const title = m.seo_title || m.title || "Global ThinQ",
      description = m.meta_description || m.description || "";
    let image = m.og_image || m.image_path || "";
    if (image)
      image = image.startsWith("/assets/")
        ? new URL(image, address).href
        : `${url}/storage/v1/object/public/media/${image}`;
    html = html
      .replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`)
      .replace(
        /<meta\s+(?:name|property)=["'](?:description|og:[^"']*)["'][^>]*>/gi,
        "",
      );
    const metadata = `<meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(m.og_title || title)}"><meta property="og:description" content="${escape(m.og_description || description)}"><meta property="og:image" content="${escape(image)}"><meta property="og:url" content="${escape(address.origin + address.pathname)}"><meta property="og:type" content="${kind === "blog" ? "article" : "website"}"><link rel="canonical" href="${escape(address.origin + address.pathname)}">`;
    return new Response(html.replace("</head>", metadata + "</head>"), {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch {
    return new Response(html, {
      headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
    });
  }
};
