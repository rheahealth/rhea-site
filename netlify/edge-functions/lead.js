// netlify/edge-functions/lead.js  (ESM, Deno)

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });

export default async (request, context) => {
  const allowOrigin = request.headers.get("Origin") || context.site?.url || "*";
  const cors = { "Access-Control-Allow-Origin": allowOrigin, Vary: "Origin" };

  // (optional) CORS preflight if browser sends OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST", ...cors });
  }

  let body;
  try {
    const ctype = request.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      body = await request.json();
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      // default to JSON parse; if fails, error
      body = await request.json();
    }
  }
  catch {
    return json({ error: "Invalid request body" }, 400, cors);
  }

  const email = (body.email || "").toString().trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email" }, 400);
  }

  // Verify Cloudflare Turnstile token
  const token = body["cf-turnstile-response"] || body["cf_turnstile_response"] || "";
  if (!token) {
    return json({ error: "Missing verification token" }, 400, cors);
  }
  const TURNSTILE_SECRET_KEY = Netlify.env.get("TURNSTILE_SECRET_KEY");
  if (!TURNSTILE_SECRET_KEY) {
    return json({ error: "Server misconfigured: missing TURNSTILE_SECRET_KEY" }, 500, cors);
  }
  try {
    const remoteip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
    });
    const verifyData = await verifyResp.json().catch(() => ({ success: false }));
    if (!verifyResp.ok || !verifyData.success) {
      return json({ error: "Verification failed", detail: verifyData }, 400, cors);
    }
    // Hostname check to reduce abuse (must be present and match)
    const verifiedHost = (verifyData.hostname || "").toLowerCase();
    const allowedExact = new Set([
      "myrheahealth.com",
      "www.myrheahealth.com",
      "localhost",
      "127.0.0.1",
      "::1",
    ]);
    const allowedSuffixes = [".netlify.app", ".netlify.live"]; // deploy previews and branch subdomains
    const isAllowed = (h) =>
      allowedExact.has(h) || allowedSuffixes.some(sfx => h.endsWith(sfx));
    if (!verifiedHost || !isAllowed(verifiedHost)) {
      return json({ error: "Invalid verification host", hostname: verifiedHost || null }, 400, cors);
    }
  } catch (e) {
    return json({ error: "Verification error", detail: String(e) }, 502, cors);
  }

  const payload = {
    email,
    first_name: body.first_name || null,
    phone: body.phone || null,
    planning_timeframe: body.planning_timeframe || null,
    consent: body.consent === true || body.consent === "true" || body.consent === "on",
    page: body.page || null,
    referrer: body.referrer || null,
    utm_source: body.utm_source || null,
    utm_medium: body.utm_medium || null,
    utm_campaign: body.utm_campaign || null,
  };

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured: missing Supabase env" }, 500, cors);
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/leads`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return json({ error: "Supabase insert failed", status: resp.status, detail: safeParse(text) ?? text }, 502, cors);
  }

  return json({ ok: true }, 200, cors);
};

function safeParse(s){ try { return JSON.parse(s); } catch { return null; } }

export const config = { path: "/api/lead" };
