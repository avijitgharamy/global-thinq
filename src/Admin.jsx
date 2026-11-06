import React, { useState, useEffect } from "react";
import { db, checked, defaults, clean, imageURL } from "./cms";
import RichEditor from "./RichEditor";
const sections = [
  "Overview",
  "Website content",
  "Blog posts",
  "Services",
  "Portfolio",
  "Media library",
  "Inquiries",
  "SEO",
];
const kindFor = {
  "Blog posts": "blog",
  Services: "service",
  Portfolio: "portfolio",
};
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  ...props
}) {
  return (
    <label>
      {label}
      {type === "textarea" ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </label>
  );
}
function Setup() {
  return (
    <div className="admin-login">
      <a href="/">← Global ThinQ</a>
      <span className="admin-kicker">CONTENT STUDIO</span>
      <h1>A home for your ideas.</h1>
      <p>
        The dashboard is installed. Connect Supabase to enable secure sign-in
        and content publishing.
      </p>
      <ol>
        <li>Run the supplied database migrations.</li>
        <li>Set the Supabase URL and publishable key in Netlify.</li>
        <li>Create your administrator account and grant its role in SQL.</li>
      </ol>
      <p>No demo credentials or public administrator access are enabled.</p>
      <a className="admin-btn" href="/">
        View website ↗
      </a>
    </div>
  );
}
export default function Admin() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(!!db),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState(location.pathname === "/admin/reset");
  useEffect(() => {
    document.title = "Content studio | Global ThinQ";
    if (!db) return;
    let alive = true;
    async function check(session) {
      try {
        if (!session) {
          setUser(null);
          return;
        }
        const {
          data: { user },
          error,
        } = await db.auth.getUser();
        if (error) throw error;
        const allowed = await checked(db.rpc("is_admin"));
        if (!allowed) {
          setUser(null);
          throw new Error(
            "This account is not authorized as an administrator.",
          );
        }
        if (alive) setUser(user);
      } catch (e) {
        if (alive) {
          setUser(null);
          setError(e.message);
        }
      } finally {
        if (alive) setChecking(false);
      }
    }
    db.auth.getSession().then(({ data }) => check(data.session));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setTimeout(() => check(session), 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!db) return <Setup />;
  if (checking)
    return (
      <div className="admin-login" role="status">
        Checking your secure session…
      </div>
    );
  if (recovery)
    return (
      <Auth
        recovery
        onDone={() => {
          setRecovery(false);
          history.replaceState(null, "", "/admin");
        }}
      />
    );
  if (!user) return <Auth error={error} />;
  return <Dashboard user={user} />;
}
function Auth({ recovery = false, onDone, error: externalError }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [reset, setReset] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(externalError || "");
  useEffect(() => {
    if (externalError) setMessage(externalError);
  }, [externalError]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      let result;
      if (recovery) {
        result = await db.auth.updateUser({ password });
      } else if (reset) {
        result = await db.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/admin/reset",
        });
      } else result = await db.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (reset)
        setMessage(
          "If this address is registered, a reset link will arrive shortly.",
        );
      if (recovery) {
        await db.auth.signOut();
        onDone();
      }
    } catch (e) {
      setMessage(
        recovery
          ? e.message
          : reset
            ? "Unable to send the reset email. Please try again."
            : e.code === "email_not_confirmed"
              ? "Confirm your email in Supabase Authentication before signing in."
              : e.code === "over_request_rate_limit"
                ? "Too many sign-in attempts. Please wait a few minutes."
                : e.status === 0 || /fetch|network/i.test(e.message || "")
                  ? "Unable to reach the login server. Check your connection and try again."
                  : "Sign-in failed. Check your email and password.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <a href="/">← Back to website</a>
      <span className="admin-kicker">GLOBAL THINQ / CONTENT STUDIO</span>
      <h1>
        {recovery
          ? "Set a new password."
          : reset
            ? "Let’s get you back in."
            : "Good to see you."}
      </h1>
      <p>
        {recovery
          ? "Choose a unique password with at least 12 characters."
          : "Your ideas. Your website. One place to manage it all."}
      </p>
      <form onSubmit={submit}>
        {!recovery && (
          <Field
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="username"
            required
          />
        )}
        {!reset && (
          <Field
            label={recovery ? "New password" : "Password"}
            type="password"
            value={password}
            onChange={setPassword}
            minLength={recovery ? 12 : 1}
            maxLength={128}
            autoComplete={recovery ? "new-password" : "current-password"}
            required
          />
        )}
        <button className="admin-btn" disabled={busy}>
          {busy
            ? "Please wait…"
            : recovery
              ? "Save password"
              : reset
                ? "Send reset link"
                : "Sign in →"}
        </button>
      </form>
      <p role="status">{message}</p>
      {!recovery && (
        <button
          className="admin-link"
          onClick={() => {
            setReset(!reset);
            setMessage("");
          }}
        >
          {reset ? "Back to sign in" : "Forgot your password?"}
        </button>
      )}
    </div>
  );
}
export function Dashboard({ user }) {
  const [tab, setTab] = useState("Overview"),
    [records, setRecords] = useState([]),
    [inquiries, setInquiries] = useState([]),
    [media, setMedia] = useState([]),
    [settings, setSettings] = useState(defaults),
    [loading, setLoading] = useState(true),
    [loadFailed, setLoadFailed] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(null),
    [search, setSearch] = useState("");
  async function load() {
    setLoading(true);
    try {
      const [r, i, m, s] = await Promise.all([
        checked(
          db
            .from("content")
            .select("*")
            .order("updated_at", { ascending: false }),
        ),
        checked(
          db
            .from("inquiries")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(500),
        ),
        checked(
          db
            .from("media")
            .select("*")
            .order("created_at", { ascending: false }),
        ),
        checked(db.from("site_settings").select("*").eq("id", "main").single()),
      ]);
      setRecords(r);
      setInquiries(i);
      setMedia(m);
      setSettings({ ...defaults, ...s.data });
      setLoadFailed(false);
    } catch (e) {
      setLoadFailed(true);
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function action(fn, success) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage(success);
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(s) {
    setTab(s);
    setEdit(null);
    setSearch("");
    setMessage("");
  }
  const kind = kindFor[tab];
  const counts = [
    ["Blog posts", "blog"],
    ["Services", "service"],
    ["Portfolio", "portfolio"],
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          GLOBAL{" "}
          <b>
            ThinQ<span>↗</span>
          </b>
        </a>
        <span className="admin-kicker">CONTENT STUDIO</span>
        <nav>
          {sections.map((s, i) => (
            <button
              key={s}
              className={tab === s ? "selected" : ""}
              onClick={() => navigate(s)}
            >
              <span>{["◫", "✎", "▤", "◇", "▧", "▦", "✉", "◎"][i]}</span>
              {s}
              {s === "Inquiries" && inquiries.some((x) => !x.is_read) && <i />}
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <small>{user.email}</small>
          <button
            onClick={() =>
              action(async () => {
                const { error } = await db.auth.signOut();
                if (error) throw error;
              }, "Signed out")
            }
          >
            Sign out ↗
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <span>
            Workspace <span>/</span> {tab}
          </span>
          <a href="/" target="_blank" rel="noopener noreferrer">
            View website ↗
          </a>
        </header>
        <div className="admin-content">
          <div className="admin-heading">
            <div>
              <div className="admin-kicker">MAKE YOUR NEXT MOVE</div>
              <h1>{tab === "Overview" ? "Your website, at a glance." : tab}</h1>
              <p>
                {tab === "Overview"
                  ? "A little clarity. More room to create."
                  : "Keep your content useful, current, and unmistakably yours."}
              </p>
            </div>
            {kind && (
              <button
                className="admin-btn"
                onClick={() =>
                  setEdit({
                    kind,
                    title: "",
                    slug: "",
                    description: "",
                    body: "",
                    category: "",
                    client: "",
                    price: "",
                    published: false,
                    image_path: "",
                    image_alt: "",
                    seo_title: "",
                    meta_description: "",
                    og_title: "",
                    og_description: "",
                    og_image: "",
                    in_sitemap: true,
                    sort_order: 0,
                    data: {
                      title: "",
                      text: "",
                      detail: "",
                      type: "",
                      deliverables: [],
                      color: "blue",
                      icon: "web",
                      tags: [],
                      className: "web-concept",
                    },
                  })
                }
              >
                + Add {kind === "blog" ? "post" : kind}
              </button>
            )}
          </div>
          {message && (
            <div className="admin-message" role="status">
              {message}
            </div>
          )}
          {loading ? (
            <p role="status">Loading your workspace…</p>
          ) : loadFailed ? (
            <section className="admin-panel">
              <h2>Unable to load your content.</h2>
              <p>
                Check your connection and database setup. Editing is paused to
                protect your existing content.
              </p>
              <button className="admin-btn" onClick={load}>
                Try again
              </button>
            </section>
          ) : (
            <>
              {tab === "Overview" && (
                <>
                  <div className="admin-stats">
                    {counts.map(([title, k], i) => (
                      <button
                        key={k}
                        onClick={() => navigate(title)}
                        className={"stat stat-" + i}
                      >
                        <span>{title} ↗</span>
                        <strong>
                          {records.filter((x) => x.kind === k).length}
                        </strong>
                        <small>
                          {
                            records.filter((x) => x.kind === k && x.published)
                              .length
                          }{" "}
                          published
                        </small>
                      </button>
                    ))}
                    <button
                      className="stat stat-3"
                      onClick={() => navigate("Inquiries")}
                    >
                      <span>Unread inquiries ↗</span>
                      <strong>
                        {inquiries.filter((x) => !x.is_read).length}
                      </strong>
                      <small>Messages waiting for you</small>
                    </button>
                  </div>
                  <div className="admin-grid">
                    <section className="admin-panel">
                      <h2>Recent inquiries</h2>
                      <InquiryList
                        items={inquiries.slice(0, 5)}
                        action={action}
                        busy={busy}
                      />
                      {!inquiries.length && (
                        <Empty text="Your next conversation starts here. New enquiries will appear in this space." />
                      )}
                    </section>
                    <section className="admin-panel admin-prompt">
                      <span>YOUR NEXT CHAPTER</span>
                      <h2>
                        Something worth
                        <br />
                        sharing?
                      </h2>
                      <p>Turn a fresh idea into your next article.</p>
                      <button
                        className="admin-btn"
                        onClick={() => navigate("Blog posts")}
                      >
                        Open your journal ↗
                      </button>
                    </section>
                  </div>
                  <section className="admin-panel">
                    <h2>Quick actions</h2>
                    <div className="admin-quick">
                      {[
                        "Website content",
                        "Services",
                        "Portfolio",
                        "Media library",
                      ].map((x) => (
                        <button key={x} onClick={() => navigate(x)}>
                          {x} ↗
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {kind &&
                (edit ? (
                  <ContentEditor
                    key={edit.id || "new"}
                    initial={edit}
                    media={media}
                    busy={busy}
                    onCancel={() => setEdit(null)}
                    onSave={(value) =>
                      action(async () => {
                        const payload = { ...value, body: clean(value.body) };
                        delete payload.updated_at;
                        delete payload.created_at;
                        await checked(db.from("content").upsert(payload));
                        setEdit(null);
                      }, "Content saved. Public pages refresh automatically within 30 seconds.")
                    }
                    onUpload={uploadFile}
                  />
                ) : (
                  <section className="admin-panel">
                    <Field
                      label="Search content"
                      value={search}
                      onChange={setSearch}
                    />
                    <div className="admin-table">
                      <div className="table-head">
                        <span>Title / category</span>
                        <span>Status</span>
                        <span>Updated</span>
                        <span>Actions</span>
                      </div>
                      {records
                        .filter(
                          (x) =>
                            x.kind === kind &&
                            `${x.title} ${x.category}`
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                        )
                        .map((x) => (
                          <div className="table-row" key={x.id}>
                            <div>
                              <strong>{x.title}</strong>
                              <small>{x.category || "Uncategorized"}</small>
                            </div>
                            <span
                              className={
                                "badge " + (x.published ? "published" : "")
                              }
                            >
                              {x.published ? "Published" : "Draft"}
                            </span>
                            <small>
                              {new Date(x.updated_at).toLocaleDateString()}
                            </small>
                            <div className="row-actions">
                              <button onClick={() => setEdit(x)}>Edit</button>
                              <button
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Permanently delete " + x.title + "?",
                                    )
                                  )
                                    action(
                                      () =>
                                        checked(
                                          db
                                            .from("content")
                                            .delete()
                                            .eq("id", x.id),
                                        ),
                                      "Deleted",
                                    );
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                    {!records.some((x) => x.kind === kind) && (
                      <Empty text="No content yet. Add your first item using the button above." />
                    )}
                  </section>
                ))}
              {tab === "Website content" && (
                <Settings
                  initial={settings}
                  busy={busy}
                  media={media}
                  save={(data) =>
                    action(
                      () =>
                        checked(
                          db
                            .from("site_settings")
                            .update({ data })
                            .eq("id", "main"),
                        ),
                      "Website content published.",
                    )
                  }
                />
              )}
              {tab === "SEO" && (
                <SEO
                  initial={settings}
                  busy={busy}
                  media={media}
                  save={(data) =>
                    action(
                      () =>
                        checked(
                          db
                            .from("site_settings")
                            .update({ data })
                            .eq("id", "main"),
                        ),
                      "Homepage SEO saved.",
                    )
                  }
                />
              )}
              {tab === "Media library" && (
                <Media
                  items={media}
                  busy={busy}
                  action={action}
                  upload={uploadFile}
                />
              )}
              {tab === "Inquiries" && (
                <section className="admin-panel">
                  <Field
                    label="Search inquiries"
                    value={search}
                    onChange={setSearch}
                  />
                  <InquiryList
                    items={inquiries.filter((x) =>
                      (x.name + x.email + x.message)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )}
                    action={action}
                    busy={busy}
                  />
                  {!inquiries.length && <Empty text="No inquiries yet." />}
                  <p>Showing up to the latest 500 inquiries.</p>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
  async function uploadFile(file, folder = "general") {
    if (!file) return "";
    if (
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("Use a JPG, PNG, WebP or AVIF image under 5 MB.");
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    }[file.type];
    const path = crypto.randomUUID() + "." + ext;
    await checked(
      db.storage
        .from("media")
        .upload(path, file, { contentType: file.type, upsert: false }),
    );
    try {
      await checked(
        db
          .from("media")
          .insert({ path, name: file.name, folder, alt: "", size: file.size }),
      );
    } catch (e) {
      await db.storage.from("media").remove([path]);
      throw e;
    }
    return path;
  }
}
function Empty({ text }) {
  return (
    <div className="admin-empty">
      <span>✳</span>
      <p>{text}</p>
    </div>
  );
}
function MediaSelect({ label, value, onChange, media }) {
  return (
    <label>
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">No image</option>
        {value && !media.some((x) => x.path === value) && (
          <option value={value}>{value}</option>
        )}
        {media.map((m) => (
          <option key={m.path} value={m.path}>
            {m.folder} / {m.name}
          </option>
        ))}
      </select>
      {value && (
        <img
          className="admin-thumb"
          src={imageURL(value)}
          alt="Selected image preview"
        />
      )}
    </label>
  );
}
function ContentEditor({ initial, media, onSave, onCancel, busy, onUpload }) {
  const [v, setV] = useState(initial),
    [uploading, setUploading] = useState(false),
    [err, setErr] = useState("");
  const set = (k, x) => setV((v) => ({ ...v, [k]: x }));
  const sub = (k, x) => setV((v) => ({ ...v, data: { ...v.data, [k]: x } }));
  const [localMedia, setLocalMedia] = useState(media);
  return (
    <form
      className="admin-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
    >
      <div className="editor-grid">
        <div>
          <Field
            label="Title"
            value={v.title}
            required
            maxLength={200}
            onChange={(x) => {
              set("title", x);
              if (!initial.id)
                set(
                  "slug",
                  x
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
            }}
          />
          <Field
            label="URL slug"
            value={v.slug}
            onChange={(x) => set("slug", x)}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={160}
            required
          />
          <Field
            label="Short description"
            type="textarea"
            value={v.description}
            maxLength={600}
            onChange={(x) => set("description", x)}
          />
          <label>Full content</label>
          <RichEditor value={v.body} onChange={(x) => set("body", x)} />
          {v.kind === "service" && (
            <>
              <Field
                label="Card headline"
                value={v.data.title}
                onChange={(x) => sub("title", x)}
              />
              <Field
                label="Card description"
                type="textarea"
                value={v.data.text}
                onChange={(x) => sub("text", x)}
              />
              <Field
                label="Service details"
                type="textarea"
                value={v.data.detail}
                onChange={(x) => sub("detail", x)}
              />
              <Field
                label="Deliverables (one per line)"
                type="textarea"
                value={(v.data.deliverables || []).join("\n")}
                onChange={(x) => sub("deliverables", x.split("\n"))}
              />
              <Field
                label="Pricing (optional, e.g. From ৳20,000)"
                value={v.price}
                onChange={(x) => set("price", x)}
              />
              <label>
                Card color
                <select
                  value={v.data.color || "blue"}
                  onChange={(e) => sub("color", e.target.value)}
                >
                  {["blue", "lavender", "peach", "mint", "ice", "pink"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
            </>
          )}
          {v.kind === "portfolio" && (
            <>
              <Field
                label="Client"
                value={v.client}
                onChange={(x) => set("client", x)}
              />
              <Field
                label="Tags (comma separated)"
                value={(v.data.tags || []).join(",")}
                onChange={(x) => sub("tags", x.split(","))}
              />
              <Field
                label="Project type"
                value={v.data.type}
                onChange={(x) => sub("type", x)}
              />
            </>
          )}
        </div>
        <div>
          <Field
            label="Category"
            value={v.category}
            maxLength={100}
            onChange={(x) => {
              set("category", x);
              sub("type", x);
            }}
          />
          <Field
            label="Display order"
            type="number"
            value={v.sort_order}
            onChange={(x) => set("sort_order", Number(x))}
          />
          <label>
            Status
            <select
              value={v.published ? "published" : "draft"}
              onChange={(e) => set("published", e.target.value === "published")}
            >
              <option value="draft">Draft / unpublished</option>
              <option value="published">Published</option>
            </select>
          </label>
          <MediaSelect
            label="Featured image"
            media={localMedia}
            value={v.image_path}
            onChange={(x) => set("image_path", x)}
          />
          <label>
            Upload featured image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);
                try {
                  const path = await onUpload(file);
                  setLocalMedia((m) => [
                    ...m,
                    { path, name: file.name, folder: "general" },
                  ]);
                  set("image_path", path);
                } catch (e) {
                  setErr(e.message);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          <Field
            label="Image alt text"
            value={v.image_alt}
            onChange={(x) => set("image_alt", x)}
          />
          <details>
            <summary>Search & social preview</summary>
            <SEOFields value={v} set={set} media={localMedia} />
          </details>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={v.in_sitemap}
              onChange={(e) => set("in_sitemap", e.target.checked)}
            />
            Include in sitemap when published
          </label>
        </div>
      </div>
      {err && <p role="alert">{err}</p>}
      <div className="editor-actions">
        <button className="admin-btn" disabled={busy || uploading}>
          {uploading
            ? "Uploading…"
            : busy
              ? "Saving…"
              : v.published
                ? "Save & publish"
                : "Save draft"}
        </button>
        <button type="button" className="admin-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
function Settings({ initial, save, busy, media }) {
  const [s, setS] = useState(structuredClone(initial)),
    [search, setSearch] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="admin-panel"
      onSubmit={(e) => {
        e.preventDefault();
        save(s);
      }}
    >
      <h2>Brand & contact information</h2>
      <div className="editor-grid">
        <MediaSelect
          label="Company logo"
          media={media}
          value={s.logo}
          onChange={(x) => setS({ ...s, logo: x })}
        />
        <MediaSelect
          label="Homepage banner image"
          media={media}
          value={s.hero_image}
          onChange={(x) => setS({ ...s, hero_image: x })}
        />
      </div>
      <div className="editor-grid">
        {Object.keys(s.contact).map((k) => (
          <Field
            key={k}
            label={k}
            type={
              ["facebook", "instagram", "linkedin"].includes(k)
                ? "url"
                : k === "email"
                  ? "email"
                  : "text"
            }
            value={s.contact[k]}
            onChange={(x) => setS({ ...s, contact: { ...s.contact, [k]: x } })}
          />
        ))}
      </div>
      <Field label="Homepage banner alt text" value={s.hero_alt} onChange={x=>setS({...s,hero_alt:x})}/><h2>Homepage text & About Us</h2>
      <p>
        Each field corresponds to existing website text. Layout and typography
        stay the same.
      </p>
      <Field label="Find text" value={search} onChange={setSearch} />
      {Object.entries(s.copy)
        .filter(([k, v]) =>
          (k + v).toLowerCase().includes(search.toLowerCase()),
        )
        .map(([k, v]) => (
          <Field
            key={k}
            label={k}
            type="textarea"
            value={v}
            onChange={(x) => setS({ ...s, copy: { ...s.copy, [k]: x } })}
          />
        ))}
      <h2>Our process</h2>
      {s.steps.map((step, i) => (
        <div className="admin-subpanel" key={i}>
          {Object.entries(step).map(([k, v]) => (
            <Field
              key={k}
              label={"Step " + (i + 1) + " " + k}
              value={v}
              onChange={(x) =>
                setS({
                  ...s,
                  steps: s.steps.map((a, n) =>
                    n === i ? { ...a, [k]: x } : a,
                  ),
                })
              }
            />
          ))}
        </div>
      ))}
      <h2>Frequently asked questions</h2>
      {s.faqs.map((faq, i) => (
        <div className="admin-subpanel" key={i}>
          {faq.map((v, j) => (
            <Field
              key={j}
              label={j ? "Answer" : "Question"}
              type="textarea"
              value={v}
              onChange={(x) =>
                setS({
                  ...s,
                  faqs: s.faqs.map((a, n) =>
                    n === i ? a.map((b, z) => (z === j ? x : b)) : a,
                  ),
                })
              }
            />
          ))}
          <button
            type="button"
            onClick={() =>
              setS({ ...s, faqs: s.faqs.filter((_, n) => n !== i) })
            }
          >
            Remove question
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setS({ ...s, faqs: [...s.faqs, ["", ""]] })}
      >
        Add question
      </button>
      <div className="editor-actions">
        <button className="admin-btn" disabled={busy}>
          {busy ? "Publishing…" : "Publish website changes"}
        </button>
      </div>
    </form>
  );
}
function SEOFields({ value, set, media }) {
  return (
    <>
      {["seo_title", "meta_description", "og_title", "og_description"].map(
        (k) => (
          <Field
            key={k}
            label={k.replaceAll("_", " ")}
            value={value[k]}
            type={k.includes("description") ? "textarea" : "text"}
            maxLength={k.includes("description") ? 300 : 200}
            onChange={(x) => set(k, x)}
          />
        ),
      )}
      <MediaSelect
        label="Open Graph image"
        value={value.og_image}
        media={media}
        onChange={(x) => set("og_image", x)}
      />
    </>
  );
}
function SEO({ initial, save, busy, media }) {
  const [v, setV] = useState(initial.seo);
  return (
    <form
      className="admin-panel"
      onSubmit={(e) => {
        e.preventDefault();
        save({ ...initial, seo: v });
      }}
    >
      <h2>Homepage search & sharing</h2>
      <SEOFields
        value={v}
        set={(k, x) => setV({ ...v, [k]: x })}
        media={media}
      />
      <p>
        Each blog post, service and project has its own SEO fields and sitemap
        toggle in its editor. Sitemap is generated dynamically on Netlify at{" "}
        <a href="/sitemap.xml">/sitemap.xml</a>.
      </p>
      <button className="admin-btn" disabled={busy}>
        Save SEO
      </button>
    </form>
  );
}
function InquiryList({ items, action, busy }) {
  return (
    <div className="inquiry-list">
      {items.map((x) => (
        <details key={x.id}>
          <summary>
            <span>
              <strong>{x.name}</strong>
              <small>{x.email}</small>
            </span>
            <span className={"badge " + (x.is_read ? "" : "published")}>
              {x.is_read ? "Read" : "New"}
            </span>
          </summary>
          <p>{x.business}</p>
          <p className="inquiry-message">{x.message}</p>
          <small>{new Date(x.created_at).toLocaleString()}</small>
          <div className="row-actions">
            <a href={"mailto:" + x.email}>Reply by email ↗</a>
            <button
              disabled={busy}
              onClick={() =>
                action(
                  () =>
                    checked(
                      db
                        .from("inquiries")
                        .update({ is_read: !x.is_read })
                        .eq("id", x.id),
                    ),
                  "Inquiry updated",
                )
              }
            >
              Mark {x.is_read ? "unread" : "read"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("Delete this inquiry permanently?"))
                  action(
                    () => checked(db.from("inquiries").delete().eq("id", x.id)),
                    "Inquiry deleted",
                  );
              }}
            >
              Delete
            </button>
          </div>
        </details>
      ))}
    </div>
  );
}
function Media({ items, busy, action, upload }) {
  const [folder, setFolder] = useState("general"),
    [filter, setFilter] = useState("");
  return (
    <section className="admin-panel">
      <h2>Your visual library</h2>
      <p>
        JPG, PNG, WebP and AVIF. Up to 5 MB each. Published media is public; do
        not upload confidential files.
      </p>
      <Field
        label="Upload folder"
        value={folder}
        onChange={setFolder}
        maxLength={80}
      />
      <label className="admin-upload">
        + Upload image
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file)
              action(() => upload(file, folder || "general"), "Image uploaded");
          }}
        />
      </label>
      <Field
        label="Search name or folder"
        value={filter}
        onChange={setFilter}
      />
      <div className="media-grid">
        {items
          .filter((x) =>
            (x.name + x.folder).toLowerCase().includes(filter.toLowerCase()),
          )
          .map((x) => (
            <MediaCard
              key={x.path + x.folder + x.alt}
              item={x}
              action={action}
              busy={busy}
            />
          ))}
      </div>
      {!items.length && (
        <Empty text="Upload your first image to start building your media library." />
      )}
    </section>
  );
}
function MediaCard({ item: x, action, busy }) {
  const [alt, setAlt] = useState(x.alt),
    [folder, setFolder] = useState(x.folder);
  return (
    <div className="media-card">
      <img src={imageURL(x.path)} alt={x.alt || x.name} />
      <strong>{x.name}</strong>
      <small>{Math.round(x.size / 1024)} KB</small>
      <Field label="Alt text" value={alt} onChange={setAlt} />
      <Field label="Folder" value={folder} onChange={setFolder} />
      <div className="row-actions">
        <button
          disabled={busy}
          onClick={() =>
            action(
              () =>
                checked(
                  db.from("media").update({ alt, folder }).eq("path", x.path),
                ),
              "Media details saved",
            )
          }
        >
          Save details
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                "Delete this unused image? Referenced images cannot be deleted.",
              )
            )
              action(async () => {
                await checked(
                  db.rpc("delete_unused_media", { media_path: x.path }),
                );
                const { error } = await db.storage
                  .from("media")
                  .remove([x.path]);
                if (error)
                  throw new Error(
                    "Metadata removed, but storage cleanup failed. Retry deletion from Supabase Storage.",
                  );
              }, "Unused media deleted");
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
