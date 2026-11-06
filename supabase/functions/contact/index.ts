import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((x) => x.trim());
  const headers = {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
  const reply = (status: number, message: string) =>
    new Response(JSON.stringify({ message }), { status, headers });
  if (!allowed.includes(origin)) return reply(403, "Origin not allowed");
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, "Method not allowed");
  try {
    const raw = await req.text();
    if (raw.length > 12000) return reply(413, "Request too large");
    const d = JSON.parse(raw);
    const name = String(d.name || "").trim(),
      email = String(d.email || "").trim(),
      business = String(d.business || "").trim(),
      message = String(d.message || "").trim();
    if (
      d.website ||
      !name ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      business.length > 200 ||
      message.length < 10 ||
      message.length > 5000 ||
      typeof d.token !== "string" ||
      d.token.length > 2048
    )
      return reply(400, "Invalid submission");
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) return reply(503, "Verification not configured");
    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: d.token }),
      },
    );
    const verification = await verify.json();
    if (
      !verification.success ||
      !allowed.some((o) => new URL(o).hostname === verification.hostname)
    )
      return reply(400, "Verification failed");
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        (Deno.env.get("RATE_LIMIT_SALT") || secret) + ip,
      ),
    );
    const bucket_key = Array.from(new Uint8Array(hash))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const { data: ok, error: limitError } = await db.rpc(
      "check_contact_limit",
      { bucket_key },
    );
    if (limitError) throw limitError;
    if (!ok) return reply(429, "Please try again later");
    const { error } = await db
      .from("inquiries")
      .insert({ name, email, business, message });
    if (error) throw error;
    return reply(200, "Inquiry received");
  } catch {
    return reply(400, "Unable to accept this submission");
  }
});
