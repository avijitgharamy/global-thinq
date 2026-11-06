import { createClient } from "@supabase/supabase-js";
export { clean } from "./sanitize";
import { useEffect, useState } from "react";
import defaults from "./defaults.json";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const db =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;
export const configured = Boolean(db);
let current = defaults;
export const t = (text) => current.copy?.[text] ?? text;
export const setting = (key) => current[key] ?? defaults[key];

export const imageURL = (path) =>
  path
    ? path.startsWith("/assets/")
      ? path
      : db?.storage.from("media").getPublicUrl(path).data.publicUrl
    : "";
export async function checked(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export function useContent() {
  const [state, setState] = useState({
    settings: defaults,
    services: defaults.services,
    portfolio: defaults.portfolio,
    posts: [],
    loading: !!db,
    error: "",
  });
  useEffect(() => {
    if (!db) return;
    let alive = true;
    async function refresh() {
      try {
        const [s, services, portfolio, posts] = await Promise.all([
          checked(
            db.from("site_settings").select("*").eq("id", "main").single(),
          ),
          checked(
            db
              .from("content")
              .select("*")
              .eq("kind", "service")
              .eq("published", true)
              .order("sort_order"),
          ),
          checked(
            db
              .from("content")
              .select("*")
              .eq("kind", "portfolio")
              .eq("published", true)
              .order("sort_order"),
          ),
          checked(
            db
              .from("content")
              .select("*")
              .eq("kind", "blog")
              .eq("published", true)
              .order("updated_at", { ascending: false }),
          ),
        ]);
        if (!alive) return;
        current = { ...defaults, ...s.data };
        setState({
          settings: current,
          services: services.map((x) => ({
            ...x.data,
            id: x.id,
            name: x.title,
            image: x.image_path,
            alt: x.image_alt,
            slug: x.slug,
            price: x.price,
          })),
          portfolio: portfolio.map((x) => ({
            ...x.data,
            id: x.id,
            name: x.title,
            desc: x.description,
            category: x.category,
            image: x.image_path,
            alt: x.image_alt,
            slug: x.slug,
            client: x.client,
          })),
          posts,
          loading: false,
          error: "",
        });
      } catch (e) {
        if (alive)
          setState((x) => ({
            ...x,
            loading: false,
            error: "Content could not be refreshed. Please try again.",
          }));
      }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return state;
}
export function useSEO(meta = {}) {
  useEffect(() => {
    document.title =
      meta.seo_title ||
      meta.title ||
      "Global ThinQ | Digital Marketing & IT Services in Dhaka";
    const tags = {
      description: meta.meta_description || meta.description || "",
      "og:title":
        meta.og_title || meta.seo_title || meta.title || "Global ThinQ",
      "og:description":
        meta.og_description || meta.meta_description || meta.description || "",
      "og:image": imageURL(meta.og_image || meta.image_path),
      "og:url": location.href,
      "og:type": meta.kind === "blog" ? "article" : "website",
    };
    Object.entries(tags).forEach(([name, content]) => {
      const prop = name.startsWith("og:") ? "property" : "name";
      let el = document.querySelector(`meta[${prop}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(prop, name);
        document.head.appendChild(el);
      }
      el.content = content;
    });
  }, [JSON.stringify(meta)]);
}
export { defaults };
