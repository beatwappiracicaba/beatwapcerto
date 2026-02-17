import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

const parseAllowed = (): Set<string> => {
  const env = Deno.env.get("ALLOWED_REFERRERS") || "";
  const parts = env.split(",").map(s => s.trim()).filter(Boolean);
  return new Set(parts);
};

const isAllowedReferer = (req: Request): boolean => {
  const ref = req.headers.get("Referer") || req.headers.get("referer") || "";
  if (!ref) return false;
  try {
    const u = new URL(ref);
    const allowed = parseAllowed();
    if (allowed.size === 0) return true;
    return allowed.has(u.host) || allowed.has(u.origin);
  } catch {
    return false;
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    if (!isAllowedReferer(req)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing url", { status: 400, headers: corsHeaders });
    }
    const targetUrl = new URL(target);
    const resp = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "BeatWap-ImageProxy/1.0"
      }
    });
    if (!resp.ok) {
      return new Response("Upstream error", { status: resp.status, headers: corsHeaders });
    }
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", resp.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
    const body = await resp.arrayBuffer();
    return new Response(body, { status: 200, headers });
  } catch {
    return new Response("Internal Error", { status: 500, headers: corsHeaders });
  }
});*** End Patch```} />
