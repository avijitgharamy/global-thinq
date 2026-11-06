import React, { useState, useEffect } from "react";
import { db, checked, clean, imageURL, useSEO } from "./cms";
export function Blog({ posts = [] }) {
  return (
    <section className="section container" id="journal">
      <div className="eyebrow">THE JOURNAL</div>
      <h2>Ideas worth sharing.</h2>
      <div className="cms-grid">
        {posts.map((p) => (
          <a className="cms-panel" href={"/blog/" + p.slug} key={p.id}>
            {p.image_path && (
              <img
                className="cms-card-image"
                src={imageURL(p.image_path)}
                alt={p.image_alt}
              />
            )}
            <small>{p.category}</small>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <span>Read article ↗</span>
          </a>
        ))}
      </div>
      {!posts.length && <p>New articles will appear here when published.</p>}
    </section>
  );
}
export function ContentPage() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [section, slug] = location.pathname.split("/").filter(Boolean);
  const kind = { blog: "blog", services: "service", portfolio: "portfolio" }[
    section
  ];
  useSEO(
    data && !Array.isArray(data) ? data : { title: "Journal | Global ThinQ" },
  );
  useEffect(() => {
    if (!db || !kind) {
      setLoading(false);
      return;
    }
    checked(
      slug
        ? db
            .from("content")
            .select("*")
            .eq("kind", kind)
            .eq("slug", slug)
            .eq("published", true)
            .maybeSingle()
        : db
            .from("content")
            .select("*")
            .eq("kind", kind)
            .eq("published", true)
            .order("updated_at", { ascending: false }),
    )
      .then(setData)
      .catch(() => setError("Unable to load content. Please try again."))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="public-content container">
      <a href="/">← Global ThinQ home</a>
      {loading ? (
        <p role="status">Loading…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : Array.isArray(data) ? (
        <Blog posts={data} />
      ) : data ? (
        <article>
          <p className="eyebrow">{data.category}</p>
          <h1>{data.title}</h1>
          <p>{data.description}</p>
          {data.image_path && (
            <img
              className="article-image"
              src={imageURL(data.image_path)}
              alt={data.image_alt}
            />
          )}
          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: clean(data.body) }}
          />
          {data.price && <p>{data.price}</p>}
          {data.client && <p>Client: {data.client}</p>}
        </article>
      ) : (
        <>
          <h1>{!db ? "Content is not connected yet." : "Page not found."}</h1>
          <p>Return home to explore Global ThinQ.</p>
        </>
      )}
    </main>
  );
}
