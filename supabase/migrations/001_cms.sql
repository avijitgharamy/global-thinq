-- Apply to a fresh Supabase project through SQL Editor or supabase db push.
begin;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.admin_users where user_id=(select auth.uid())); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
create table public.site_settings(id text primary key check(id='main'),data jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now());
create table public.content(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('blog','service','portfolio')),
 title text not null check(length(title) between 1 and 200),slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=160),
 description text not null default '' check(length(description)<=600),body text not null default '' check(length(body)<=500000),category text not null default '' check(length(category)<=100),
 client text not null default '',price text not null default '',image_path text not null default '',image_alt text not null default '',
 seo_title text not null default '',meta_description text not null default '',og_title text not null default '',og_description text not null default '',og_image text not null default '',
 published boolean not null default false,in_sitemap boolean not null default true,sort_order integer not null default 0,data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(kind,slug));
create index content_public on public.content(kind,published,sort_order);
create table public.media(path text primary key,name text not null,folder text not null default 'general',alt text not null default '',size integer not null check(size>0 and size<=5242880),created_at timestamptz not null default now());
create table public.inquiries(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 120),email text not null check(length(email)<=254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),business text not null default '' check(length(business)<=200),message text not null check(length(message) between 10 and 5000),is_read boolean not null default false,created_at timestamptz not null default now());
create function public.touch_updated() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
create trigger content_updated before update on public.content for each row execute function public.touch_updated();
create trigger settings_updated before update on public.site_settings for each row execute function public.touch_updated();
alter table public.content enable row level security;
alter table public.site_settings enable row level security;
alter table public.media enable row level security;
alter table public.inquiries enable row level security;
revoke all on public.content,public.site_settings,public.media,public.inquiries from anon,authenticated;
grant select on public.content,public.site_settings to anon,authenticated;
grant insert,update,delete on public.content to authenticated;
grant update on public.site_settings to authenticated;
grant select,insert,update,delete on public.media to authenticated;
grant select,update,delete on public.inquiries to authenticated;
grant insert on public.inquiries to service_role;
create policy content_public on public.content for select using(published or (select public.is_admin()));
create policy content_admin_insert on public.content for insert to authenticated with check((select public.is_admin()));
create policy content_admin_update on public.content for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy content_admin_delete on public.content for delete to authenticated using((select public.is_admin()));
create policy settings_public on public.site_settings for select using(true);
create policy settings_admin on public.site_settings for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy media_admin on public.media for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy inquiries_admin on public.inquiries for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
-- No public INSERT grant or policy on inquiries; validated Edge Function only.
create function public.media_in_use(media_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.content where image_path=media_path or og_image=media_path or position(media_path in body)>0 or position(media_path in data::text)>0)
 or exists(select 1 from public.site_settings where position(media_path in data::text)>0);
$$;
revoke all on function public.media_in_use(text) from public;
grant execute on function public.media_in_use(text) to authenticated;
create function public.guard_media_delete() returns trigger language plpgsql security definer set search_path='' as $$begin if public.media_in_use(old.path) then raise exception 'This image is still used by website content. Remove its references first.';end if;return old;end;$$;
create trigger media_delete_guard before delete on public.media for each row execute function public.guard_media_delete();
create function public.delete_unused_media(media_path text) returns void language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'Unauthorized';end if;delete from public.media where path=media_path;end;$$;
revoke all on function public.delete_unused_media(text) from public;
grant execute on function public.delete_unused_media(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('media','media',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']);
create policy storage_admin_read on storage.objects for select to authenticated using(bucket_id='media' and (select public.is_admin()));
create policy storage_admin_upload on storage.objects for insert to authenticated with check(bucket_id='media' and (select public.is_admin()));
-- Files are immutable: upload a new UUID path for replacements.
create policy storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='media' and (select public.is_admin()) and not public.media_in_use(name));
create table public.contact_limits(bucket text primary key,started_at timestamptz not null default now(),hits integer not null default 1);
alter table public.contact_limits enable row level security;
revoke all on public.contact_limits from anon,authenticated;
create function public.check_contact_limit(bucket_key text) returns boolean language plpgsql security definer set search_path='' as $$declare n integer;begin
 insert into public.contact_limits(bucket) values(bucket_key) on conflict(bucket) do update set hits=case when public.contact_limits.started_at<now()-interval '1 hour' then 1 else public.contact_limits.hits+1 end,started_at=case when public.contact_limits.started_at<now()-interval '1 hour' then now() else public.contact_limits.started_at end returning hits into n;
 delete from public.contact_limits where started_at<now()-interval '2 days';return n<=5;end;$$;
revoke all on function public.check_contact_limit(text) from public,anon,authenticated;
grant execute on function public.check_contact_limit(text) to service_role;
commit;
