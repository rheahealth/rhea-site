// netlify/edge-functions/lead.js  (ESM, Deno)

const ALLOWED_ORIGINS = new Set([
  "https://myrheahealth.com",
  "https://www.myrheahealth.com",
  "http://localhost",
  "http://127.0.0.1",
  "http://localhost:8888",
  "http://127.0.0.1:8888",
]);

const ALLOWED_ORIGIN_SUFFIXES = [".netlify.app", ".netlify.live"];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return ALLOWED_ORIGIN_SUFFIXES.some(sfx => host.endsWith(sfx));
  } catch {
    return false;
  }
}

const ALLOWED_TURNSTILE_HOSTS = new Set([
  "myrheahealth.com",
  "www.myrheahealth.com",
  "localhost",
  "127.0.0.1",
  "::1",
]);

function isAllowedTurnstileHost(host) {
  return ALLOWED_TURNSTILE_HOSTS.has(host) || ALLOWED_ORIGIN_SUFFIXES.some(sfx => host.endsWith(sfx));
}

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });

const MAX_LENGTHS = { first_name: 100, phone: 30, page: 300, referrer: 500, utm_source: 100, utm_medium: 100, utm_campaign: 100 };

function clamp(val, max) {
  return typeof val === "string" ? val.slice(0, max) : null;
}

export default async (request, context) => {
  const origin = request.headers.get("Origin") || "";

  // If an Origin header is present, it must be on the allowlist.
  // Requests with no Origin header (e.g. server-to-server) are allowed through.
  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: "Forbidden" }, 403);
  }

  const cors = origin
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : {};

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
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
      body = await request.json();
    }
  } catch {
    return json({ error: "Invalid request body" }, 400, cors);
  }

  const email = (body.email || "").toString().trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: "Invalid email" }, 400, cors);
  }

  // Verify Cloudflare Turnstile token
  const token = body["cf-turnstile-response"] || body["cf_turnstile_response"] || "";
  if (!token) {
    return json({ error: "Missing verification token" }, 400, cors);
  }
  const TURNSTILE_SECRET_KEY = Netlify.env.get("TURNSTILE_SECRET_KEY");
  if (!TURNSTILE_SECRET_KEY) {
    return json({ error: "Server misconfigured" }, 500, cors);
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
      return json({ error: "Verification failed" }, 400, cors);
    }
    const verifiedHost = (verifyData.hostname || "").toLowerCase();
    if (!verifiedHost || !isAllowedTurnstileHost(verifiedHost)) {
      return json({ error: "Invalid verification host" }, 400, cors);
    }
  } catch {
    return json({ error: "Verification error" }, 502, cors);
  }

  const VALID_TIMEFRAMES = new Set(["trying_now", "0_6_months", "6_12_months", "gt_12_months", ""]);
  const planning_timeframe = (body.planning_timeframe || "").toString();

  const payload = {
    email,
    first_name: clamp(body.first_name, MAX_LENGTHS.first_name),
    phone: clamp(body.phone, MAX_LENGTHS.phone),
    planning_timeframe: VALID_TIMEFRAMES.has(planning_timeframe) ? planning_timeframe || null : null,
    consent: body.consent === true || body.consent === "true" || body.consent === "on",
    page: clamp(body.page, MAX_LENGTHS.page),
    referrer: clamp(body.referrer, MAX_LENGTHS.referrer),
    utm_source: clamp(body.utm_source, MAX_LENGTHS.utm_source),
    utm_medium: clamp(body.utm_medium, MAX_LENGTHS.utm_medium),
    utm_campaign: clamp(body.utm_campaign, MAX_LENGTHS.utm_campaign),
  };

  const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured" }, 500, cors);
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

  if (!resp.ok) {
    return json({ error: "Submission failed" }, 502, cors);
  }

  return json({ ok: true }, 200, cors);
};

export const config = { path: "/api/lead" };
