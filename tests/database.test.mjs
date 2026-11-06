import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const admin = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
let db;
test("SQL migrations and RLS behavior", async (t) => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to authenticated;`,
  );
  await db.exec(await readFile("supabase/migrations/001_cms.sql", "utf8"));
  await db.exec(
    await readFile("supabase/migrations/002_preserve_content.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users values('${admin}'),('${other}');insert into public.admin_users values('${admin}');insert into public.content(kind,title,slug,published) values('blog','Secret draft','secret-draft',false),('blog','Public article','public-article',true);`,
  );
  async function as(role, id, fn) {
    await db.exec(
      `set role ${role};select set_config('request.jwt.claim.sub','${id || ""}',false);`,
    );
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  }
  await t.test("anonymous visitors only see published content", () =>
    as("anon", "", async () => {
      const { rows } = await db.query("select title from public.content");
      assert(rows.some((x) => x.title === "Public article"));
      assert(!rows.some((x) => x.title === "Secret draft"));
    }),
  );
  await t.test("anonymous cannot read inquiries or write content", () =>
    as("anon", "", async () => {
      await assert.rejects(db.query("select * from public.inquiries"));
      await assert.rejects(
        db.query(
          "insert into public.content(kind,title,slug) values('blog','hack','hack')",
        ),
      );
      await assert.rejects(
        db.query(
          "insert into public.inquiries(name,email,message) values('X','x@y.com','This is spam content')",
        ),
      );
    }),
  );
  await t.test("authenticated non-admin cannot modify or read drafts", () =>
    as("authenticated", other, async () => {
      assert.equal(
        (await db.query("select public.is_admin() ok")).rows[0].ok,
        false,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.content where slug='secret-draft'",
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "update public.content set title='hacked' where slug='public-article' returning id",
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into public.admin_users values('00000000-0000-4000-8000-000000000003')",
        ),
      );
      assert.equal(
        (await db.query("select * from public.inquiries")).rows.length,
        0,
      );
    }),
  );
  await t.test("admin can create, edit, publish and delete content", () =>
    as("authenticated", admin, async () => {
      assert.equal(
        (await db.query("select public.is_admin() ok")).rows[0].ok,
        true,
      );
      await db.query(
        "insert into public.content(kind,title,slug) values('blog','Test','test')",
      );
      await db.query(
        "update public.content set title='Edited',published=true where slug='test'",
      );
      assert.equal(
        (await db.query("select title from public.content where slug='test'"))
          .rows[0].title,
        "Edited",
      );
      await db.query("delete from public.content where slug='test'");
    }),
  );
  await t.test("media deletion refuses referenced assets", () =>
    as("authenticated", admin, async () => {
      await db.query(
        "insert into public.media(path,name,size) values('used.webp','Used',100),('unused.webp','Unused',100)",
      );
      await db.query(
        "update public.content set image_path='used.webp' where slug='secret-draft'",
      );
      await assert.rejects(
        db.query("select public.delete_unused_media('used.webp')"),
      );
      await db.query("select public.delete_unused_media('unused.webp')");
      assert.equal(
        (await db.query("select * from public.media where path='unused.webp'"))
          .rows.length,
        0,
      );
    }),
  );
  await t.test(
    "storage upload is admin-only and referenced files protected",
    async () => {
      await as("authenticated", other, async () => {
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('media','bad.webp')",
          ),
        );
      });
      await as("authenticated", admin, async () => {
        await db.query(
          "insert into storage.objects(bucket_id,name) values('media','used.webp')",
        );
        assert.equal(
          (
            await db.query(
              "delete from storage.objects where name='used.webp' returning id",
            )
          ).rows.length,
          0,
        );
      });
    },
  );
  await t.test(
    "rate limiter allows five then blocks; not callable publicly",
    async () => {
      await as("anon", "", async () => {
        await assert.rejects(
          db.query("select public.check_contact_limit('test')"),
        );
      });
      await as("service_role", "", async () => {
        for (let i = 0; i < 5; i++)
          assert.equal(
            (await db.query("select public.check_contact_limit('test') ok"))
              .rows[0].ok,
            true,
          );
        assert.equal(
          (await db.query("select public.check_contact_limit('test') ok"))
            .rows[0].ok,
          false,
        );
      });
    },
  );
  await t.test("database rejects unsafe slugs", () =>
    as("authenticated", admin, async () => {
      await assert.rejects(
        db.query(
          "insert into public.content(kind,title,slug) values('blog','bad','<script>')",
        ),
      );
    }),
  );
  await db.close();
});
