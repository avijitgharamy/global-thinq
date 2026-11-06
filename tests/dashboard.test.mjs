import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { JSDOM } from "jsdom";
const dom = new JSDOM('<div id="root"></div>', {
  url: "http://localhost/admin",
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.location = dom.window.location;
global.history = dom.window.history;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const defaults = JSON.parse(await readFile("src/defaults.json", "utf8"));
let records = [
    {
      id: "one",
      kind: "blog",
      title: "Existing article",
      slug: "existing",
      published: true,
      category: "News",
      updated_at: "2026-11-05T10:00:00Z",
      data: {},
    },
  ],
  inquiries = [
    {
      id: "q1",
      name: "Test visitor",
      email: "visitor@example.com",
      message: "A staging test inquiry",
      is_read: false,
      created_at: "2026-11-05T10:00:00Z",
    },
  ];
let admin = true;
global.__cmsDB = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "admin" } } } }),
    getUser: async () => ({
      data: { user: { id: "admin", email: "admin@example.com" } },
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
  rpc: async () => ({ data: admin, error: null }),
  from(table) {
    let op = "select",
      payload,
      match;
    const query = {
      select() {
        return this;
      },
      order() {
        return this;
      },
      limit() {
        return this;
      },
      eq(k, v) {
        match = [k, v];
        return this;
      },
      single() {
        return this;
      },
      upsert(x) {
        op = "upsert";
        payload = x;
        return this;
      },
      update(x) {
        op = "update";
        payload = x;
        return this;
      },
      delete() {
        op = "delete";
        return this;
      },
      then(resolve) {
        if (table === "content" && op === "upsert")
          records.push({
            ...payload,
            id: "new",
            updated_at: new Date().toISOString(),
          });
        if (table === "inquiries" && op === "update")
          inquiries = inquiries.map((x) =>
            x[match[0]] === match[1] ? { ...x, ...payload } : x,
          );
        resolve({
          data:
            table === "content"
              ? records
              : table === "inquiries"
                ? inquiries
                : table === "media"
                  ? []
                  : { data: defaults },
          error: null,
        });
      },
    };
    return query;
  },
};
const bundle = await build({
  entryPoints: ["src/Admin.jsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  write: false,
  plugins: [
    {
      name: "mock-cms-for-ui-only",
      setup(b) {
        b.onResolve({ filter: /^\.\/cms$/ }, () => ({
          path: "cms",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export const db=globalThis.__cmsDB;export const defaults=${JSON.stringify(defaults)};export const clean=x=>x||'';export const imageURL=x=>x;export async function checked(q){const r=await q;if(r.error)throw r.error;return r.data;}`,
          loader: "js",
        }));
      },
    },
  ],
});
const file = new URL("./.dashboard-fixture.mjs", import.meta.url);
await writeFile(file, bundle.outputFiles[0].text);
const { default: Admin, Dashboard } = await import(file.href);
await unlink(file);
const root = createRoot(document.getElementById("root"));
const flush = () =>
  React.act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
const click = async (label) => {
  const button = [...document.querySelectorAll("button")].find((x) =>
    x.textContent.includes(label),
  );
  assert(button, "Button found: " + label);
  await React.act(async () =>
    button.dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
  );
  await flush();
};
const fill = async (label, value) => {
  const l = [...document.querySelectorAll("label")].find(
    (x) => x.childNodes[0]?.textContent === label,
  );
  assert(l, "Field found: " + label);
  const el = l.querySelector("input,textarea");
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(
      el.tagName === "INPUT"
        ? window.HTMLInputElement.prototype
        : window.HTMLTextAreaElement.prototype,
      "value",
    ).set.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};
test("dashboard loads, edits drafts and manages enquiry status", async () => {
  await React.act(async () =>
    root.render(
      React.createElement(Dashboard, { user: { email: "admin@example.com" } }),
    ),
  );
  await flush();
  assert.match(document.body.textContent, /Your website, at a glance/);
  assert.match(document.body.textContent, /Test visitor/);
  await click("Blog posts");
  assert.match(document.body.textContent, /Existing article/);
  await click("+ Add post");
  await fill("Title", "Draft from dashboard");
  await fill("Short description", "A test description");
  await React.act(async () =>
    document
      .querySelector("form")
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      ),
  );
  await flush();
  assert.equal(records.at(-1).title, "Draft from dashboard");
  assert.equal(records.at(-1).published, false);
  assert.equal(records.at(-1).slug, "draft-from-dashboard");
  await click("Inquiries");
  await click("Mark read");
  assert.equal(inquiries[0].is_read, true);
  for (const section of [
    "Website content",
    "Services",
    "Portfolio",
    "Media library",
    "SEO",
  ]) {
    await click(section);
    assert(!document.body.textContent.includes("TypeError"));
  }
});
test("authenticated non-admin is blocked before dashboard rendering", async () => {
  await React.act(async () => root.render(null));
  admin = false;
  await React.act(async () => root.render(React.createElement(Admin)));
  await flush();
  assert.match(document.body.textContent, /not authorized as an administrator/);
  assert(!document.body.textContent.includes("Your website, at a glance."));
  await React.act(async () => root.unmount());
});
