// netlify/edge-functions/lead.js  (ESM, Deno)

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });

export default async (request, context) => {
  // (optional) CORS preflight if browser sends OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": context.site?.url || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const email = (body.email || "").toString().trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email" }, 400);
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
    return json({ error: "Server misconfigured: missing Supabase env" }, 500);
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
    return json({ error: "Supabase insert failed", status: resp.status, detail: safeParse(text) ?? text }, 502);
  }

  return json({ ok: true });
};

function safeParse(s){ try { return JSON.parse(s); } catch { return null; } }

export const config = { path: "/api/lead" };
