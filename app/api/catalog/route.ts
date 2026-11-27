import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Catalog = { type: string; id: string; name?: string };

function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 0 || b === 168)) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0) return false;
    return true;
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    return value.startsWith("2") || value.startsWith("3");
  }
  return false;
}

async function validateDestination(url: URL) {
  if (url.protocol !== "https:") throw new Error("Only HTTPS catalogue sources are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
  if (url.port && url.port !== "443") throw new Error("Only the standard HTTPS port is supported.");
  const host = url.hostname.replace(/^\\[|\\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Local network addresses are not allowed.");
  }
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error("Private or reserved network addresses are not allowed.");
    return;
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !isPublicAddress(record.address))) {
    throw new Error("The source host must resolve only to public IP addresses.");
  }
}

async function fetchJson(input: URL): Promise<unknown> {
  let url = input;
  for (let redirects = 0; redirects <= 3; redirects++) {
    await validateDestination(url);
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json", "User-Agent": "AFTERFRAME-Catalogue/1.0" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) throw new Error("The catalogue source redirected too many times.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error("The catalogue source returned HTTP " + response.status + ".");
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 3_000_000) throw new Error("The catalogue response is larger than the 3 MB limit.");
    const body = await response.text();
    if (body.length > 3_000_000) throw new Error("The catalogue response is larger than the 3 MB limit.");
    try {
      return JSON.parse(body);
    } catch {
      throw new Error("The catalogue source returned invalid JSON.");
    }
  }
  throw new Error("Unable to retrieve this catalogue source.");
}

function textField(value: unknown, max = 1000): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

function safeMeta(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.name !== "string") return null;
  return {
    id: item.id.slice(0, 300),
    type: textField(item.type, 40),
    name: item.name.slice(0, 200),
    poster: textField(item.poster, 2000),
    background: textField(item.background, 2000),
    description: textField(item.description, 1200),
    releaseInfo: textField(item.releaseInfo, 80),
    imdbRating: textField(item.imdbRating, 20),
    runtime: textField(item.runtime, 40),
    genres: Array.isArray(item.genres) ? item.genres.filter((g): g is string => typeof g === "string").slice(0, 12) : [],
  };
}

export async function GET(request: NextRequest) {
  const manifestInput = request.nextUrl.searchParams.get("manifestUrl") || "";
  if (!manifestInput || manifestInput.length > 2048) {
    return NextResponse.json({ error: "A valid manifest URL is required." }, { status: 400 });
  }

  try {
    let manifestUrl: URL;
    try {
      manifestUrl = new URL(manifestInput);
    } catch {
      return NextResponse.json({ error: "Enter a valid manifest URL." }, { status: 400 });
    }

    const raw = await fetchJson(manifestUrl);
    if (!raw || typeof raw !== "object") throw new Error("The source returned an invalid manifest.");
    const manifest = raw as Record<string, unknown>;
    const rawCatalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs : [];
    const catalogs: Catalog[] = rawCatalogs
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .filter((item) => typeof item.id === "string" && typeof item.type === "string")
      .slice(0, 40)
      .map((item) => ({
        id: (item.id as string).slice(0, 160),
        type: (item.type as string).slice(0, 40),
        name: textField(item.name, 100),
      }));

    const catalogId = request.nextUrl.searchParams.get("catalogId");
    const type = request.nextUrl.searchParams.get("type");
    if (!catalogId || !type) {
      return NextResponse.json({
        addon: textField(manifest.name, 120) || "Catalogue source",
        catalogs,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const selected = catalogs.find((item) => item.id === catalogId && item.type === type);
    if (!selected) return NextResponse.json({ error: "That catalogue is not declared by this add-on." }, { status: 400 });

    const resources = Array.isArray(manifest.resources) ? manifest.resources : [];
    const supportsCatalog = resources.some((resource) =>
      resource === "catalog" ||
      (resource && typeof resource === "object" && (resource as Record<string, unknown>).name === "catalog")
    );
    if (!supportsCatalog) {
      return NextResponse.json({ metas: [], addon: textField(manifest.name, 120) || "Catalogue source" });
    }

    const skipRaw = Number(request.nextUrl.searchParams.get("skip") || "0");
    const skip = Number.isInteger(skipRaw) ? Math.max(0, Math.min(skipRaw, 500)) : 0;
    const base = new URL("./", manifestUrl);
    const catalogUrl = new URL(
      "catalog/" + encodeURIComponent(type) + "/" + encodeURIComponent(catalogId) + ".json",
      base,
    );
    catalogUrl.searchParams.set("skip", String(skip));
    const result = await fetchJson(catalogUrl);
    const resultObject = result && typeof result === "object" ? result as Record<string, unknown> : {};
    const metas = Array.isArray(resultObject.metas)
      ? resultObject.metas.map(safeMeta).filter((item): item is NonNullable<ReturnType<typeof safeMeta>> => item !== null).slice(0, 100)
      : [];

    return NextResponse.json({
      addon: textField(manifest.name, 120) || "Catalogue source",
      catalog: selected,
      metas,
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load this catalogue.";
    const status = message.includes("HTTPS") || message.includes("not allowed") || message.includes("public IP") ? 400 : 502;
    return NextResponse.json({ error: message }, {
      status,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
