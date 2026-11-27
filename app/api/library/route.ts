import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return { base: parsed.toString().replace(/\/$/, ""), key };
  } catch {
    return null;
  }
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request)) return responseError("Admin access is required.", 403);
  const settings = config();
  if (!settings) return NextResponse.json({ configured: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const response = await fetch(settings.base + "/rest/v1/afterframe_user_state?select=saved_title_ids,addons&id=eq.primary", {
      headers: { apikey: settings.key, Authorization: "Bearer " + settings.key },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return responseError("Supabase could not load the library.", 502);
    const rows = await response.json() as Array<{ saved_title_ids?: unknown; addons?: unknown }>;
    const row = rows[0];
    return NextResponse.json({
      configured: true,
      state: row ? { savedTitleIds: row.saved_title_ids, addons: row.addons } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return responseError("Supabase is temporarily unavailable.", 502);
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdminSession(request)) return responseError("Admin access is required.", 403);
  const settings = config();
  if (!settings) return responseError("Cloud sync is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.", 503);
  let body: unknown;
  try { body = await request.json(); } catch { return responseError("Invalid library payload.", 400); }
  if (!body || typeof body !== "object") return responseError("Invalid library payload.", 400);
  const value = body as Record<string, unknown>;
  const savedTitleIds = Array.isArray(value.savedTitleIds)
    ? value.savedTitleIds.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id)).slice(0, 2000)
    : [];
  const addons = Array.isArray(value.addons) ? value.addons.slice(0, 50).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const addon = item as Record<string, unknown>;
    const manifest = addon.manifest as Record<string, unknown> | undefined;
    if (!manifest || typeof manifest !== "object" || typeof addon.manifestUrl !== "string") return false;
    try {
      const url = new URL(addon.manifestUrl);
      const resources = Array.isArray(manifest.resources) ? manifest.resources : [];
      return url.protocol === "https:" && resources.includes("catalog") && Array.isArray(manifest.catalogs);
    } catch { return false; }
  }) : [];
  try {
    const response = await fetch(settings.base + "/rest/v1/afterframe_user_state?on_conflict=id", {
      method: "POST",
      headers: {
        apikey: settings.key,
        Authorization: "Bearer " + settings.key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: "primary", saved_title_ids: savedTitleIds, addons, updated_at: new Date().toISOString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return responseError("Supabase rejected the library update.", 502);
    return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return responseError("Supabase is temporarily unavailable.", 502);
  }
}
