# Global ThinQ — React website & Supabase CMS

This extends the existing React 19 / Vite 6.4.5 website. The original layout, colors, responsive styles, process tabs, creative concepts, service dialogs and downloadable brief are retained. The supplied company logo is embedded without its transparent outer margins using an SVG viewport; the original pixels are unchanged.

## Current status

The CMS code, SQL migrations, contact Edge Function, Netlify functions and deployment configuration are implemented. A production build and automated local tests pass. The public page, service dialog and unconfigured admin gate were checked in the browser.

**Not yet activated or verified against your accounts:** hosted Supabase migrations, email/password login, password reset delivery, authenticated dashboard CRUD, hosted Storage uploads, Turnstile delivery and a Netlify deployment. These require the configuration below. This is not a claim of a fully commissioned production CMS.

## What is included

- `/admin`: authorized-admin email/password login, password reset, session refresh and logout. No registration form, embedded credentials or role granted from user metadata.
- Overview counts, recent enquiries, quick actions and responsive sidebar.
- Homepage copy, About Us text, banner, logo, process, FAQs, contact information and social links in `site_settings`.
- Blog, services and portfolio: create/edit/delete, drafts/publishing, custom slugs, categories, image upload/picker, alt text, rich text, SEO/social metadata, display order. Services support pricing; projects support client details.
- Media: upload JPG/PNG/WebP/AVIF up to 5 MB, preview, named folders, alt text, and deletion guard for referenced images. Formats are accepted as supplied; automatic compression/transcoding is not included.
- Enquiries: server-side validation, Turnstile, honeypot, database-backed rate limit, private inbox, read/unread, delete. The original downloadable project brief remains available independently.
- Public content is fetched at runtime; a fresh visit gets the latest published data, and an open homepage refreshes within 30 seconds or on focus. No content redeployment required. Open individual articles refresh when reloaded.
- Netlify dynamic sitemap and server-rendered social metadata. Content bodies remain React-rendered. Metadata changes have a maximum 30-second cache; sitemap up to 60 seconds.

## Local development

Use Node 22:

```sh
npm ci
cp .env.example .env
# Fill only your own public project values in .env
npm run dev
npm test
npm run build
```

Never commit `.env`. The app gracefully preserves the existing static website before Supabase is configured. `/admin` shows setup instructions and enquiry sending is disabled. No fake persistence or demo authentication is used.

## 1. Configure Supabase

Create your project in your own Supabase account. Keep the database password and secret/service-role keys private.

Run these in order in the Supabase SQL Editor, or apply with `supabase db push` to a linked project:

1. `supabase/migrations/001_cms.sql`
2. `supabase/migrations/002_preserve_content.sql`

These are one-time migrations for a fresh database; do not rerun against existing tables. The second migration imports the current homepage text, six existing services and three explicitly illustrative portfolio concepts. No invented clients, contact details or testimonials are added.

In Authentication:

- Disable public user sign-ups.
- Create your administrator through Supabase's user management. Set the password securely in your account, not in source code or chat.
- Copy the created user's actual UUID. Run the following, replacing the placeholder with that UUID:

```sql
insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');
```

`admin_users` has no browser read/write grants. Only trusted SQL/project administration can assign roles. User metadata cannot make someone an admin. To revoke admin access, delete the corresponding `admin_users` row.

- Set Site URL to your final HTTPS Netlify/custom domain.
- Add `https://YOUR-DOMAIN/admin/reset` to Redirect URLs; add a localhost reset URL only if you need local testing.
- Configure your production SMTP provider and sender domain for reset delivery. Enable your desired password/session policies in Supabase Auth; use a minimum 12-character password.
- Password recovery uses PKCE, so open the emailed reset link in the same browser that requested it.

The migration creates the `media` bucket. Public marketing images are public by URL. All writes and listing are admin-only; do not put confidential files in this bucket. Draft database records are not publicly readable, but uploaded draft images are still public assets.

## 2. Configure contact protection

Create a Cloudflare Turnstile widget for your production hostname (and localhost if required). Put the public site key in `VITE_TURNSTILE_SITE_KEY`.

Deploy the included Supabase Edge Function using your own Supabase CLI authentication:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy contact --no-verify-jwt
```

The endpoint is intentionally available to anonymous website visitors. It validates Turnstile, allowed origin, input sizes and rate limits before any insert. Browser users cannot insert directly into `inquiries`.

Set these **server-only** secrets in Supabase Edge Functions Secrets:

| Secret | Value |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret from your Turnstile widget |
| `ALLOWED_ORIGINS` | Comma-separated exact origins, e.g. `https://YOUR-DOMAIN` (no trailing slash) |
| `RATE_LIMIT_SALT` | A newly generated long random secret |

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to its Edge Functions. These must never be prefixed with `VITE_`, embedded in frontend files, or added to GitHub source. Messages are limited to five accepted verification attempts per IP hash per hour; old buckets are removed automatically during checks. Invalid submissions fail closed. For very high traffic, add provider-level edge rate limiting as well.

## 3. Deploy through GitHub to Netlify

1. Create/select your own GitHub repository and push this source tree. Exclude `.env`, `node_modules` and `dist`.
2. In Netlify, choose **Add new project → Import an existing project → GitHub** and select that repository and production branch.
3. Build command: `npm run build`; publish directory: `dist`. `netlify.toml` supplies these, functions, routing and security headers.
4. Add the environment variables below in Netlify. The `VITE_` values must be available at build time. The URL and publishable key must also be available to Functions runtime for sitemap and metadata rendering.
5. Deploy. Future pushes to the linked branch trigger automatic deployment. `.github/workflows/checks.yml` also runs the tests and build on pushes and pull requests.
6. Update Supabase redirect URLs, Turnstile allowed hostnames and `ALLOWED_ORIGINS` after adding a custom domain.

| Netlify variable | Purpose | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Your `https://PROJECT.supabase.co` URL | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or legacy anon key) | No; protected by RLS |
| `VITE_TURNSTILE_SITE_KEY` | Browser verification widget | No |
| `SITE_URL` | Optional canonical origin; Netlify `URL` is used for sitemap by default | No |

The supplied CSP permits the standard `*.supabase.co` endpoints. If you use a custom Supabase domain, explicitly add its HTTPS/WSS origins to `netlify.toml` before deployment.

`/admin`, `/admin/reset`, `/blog/slug`, `/services/slug` and `/portfolio/slug` work on direct refresh. On Netlify, `/sitemap.xml` is generated from published rows with `in_sitemap=true`; no manual rebuild is needed. The Netlify-specific functions do not run on the separate ChatGPT Sites preview, which is only a static website preview.

## 4. Verify before launch

Use a staging project and disposable content:

- Sign in with the admin account; create a draft, confirm an anonymous browser cannot see it; publish and confirm the public page updates; edit and delete the test record.
- Sign in using a non-admin test user: dashboard access and writes must be denied. Confirm that the user cannot read contact submissions.
- Test password-reset email delivery and logout.
- Upload an image, attach it to a record, confirm deletion is blocked; detach it and delete it.
- Submit a real Turnstile-verified enquiry; confirm it appears privately in the dashboard; test read/unread.
- Refresh `/admin` and a published blog URL directly; inspect `/sitemap.xml` and page source for Open Graph tags.
- Review mobile layout on a phone and verify your real contact/social information before publishing it.

Automated tests use PGlite (PostgreSQL WASM) with stub Supabase auth/storage schemas: they execute both migrations and test real PostgreSQL RLS for anonymous, non-admin and admin roles, draft visibility, writes, protected media deletion and rate limits. Dashboard interaction tests use a mocked transport to check draft creation, inquiry read status, section rendering and the non-admin guard. Additional tests cover XSS sanitization, sitemap generation and escaped server-side SEO tags. They do not substitute for live Auth, Storage HTTP, SMTP or Turnstile integration tests.

## Main files

- `src/main.jsx`, `src/style.css`: retained public design, wired to CMS data.
- `src/Admin.jsx`, `src/admin.css`: admin screens and editors.
- `src/cms.js`, `src/sanitize.js`: Supabase access, runtime loading, metadata and sanitization.
- `src/Contact.jsx`, `supabase/functions/contact/index.ts`: enquiry UI and protected endpoint.
- `netlify/functions/`: dynamic sitemap and social metadata.
- `supabase/migrations/`: database schema, policies and preserved content.

Back up your Supabase database and Storage before destructive administration. Dashboard delete actions require confirmation but are permanent; database backups are the recovery path.
