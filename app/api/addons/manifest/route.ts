import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Manifest = {
  id: string;
  version: string;
  name: string;
  description?: string;
  logo?: string;
  resources: Array<string | { name: string; types?: string[]; idPrefixes?: string[] }>;
  types: string[];
  catalogs?: Array<{ type: string; id: string; name?: string; extra?: Array<{ name: string; isRequired?: boolean }> }>;
  idPrefixes?: string[];
  behaviorHints?: Record<string, unknown>;
};

function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    const p = address.split(".").map(Number);
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0) return false;
    return true;
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    // Only globally-routable unicast space; reject loopback, link-local,
    // unique-local, multicast, IPv4-mapped and unspecified addresses.
    return value.startsWith("2") || value.startsWith("3");
  }
  return false;
}

async function validateDestination(url: URL) {
  if (url.protocol !== "https:") throw new Error("Use a secure HTTPS manifest URL.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
  if (url.port && url.port !== "443") throw new Error("Only the standard HTTPS port is supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Local network addresses are not allowed.");
  }
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error("Private or reserved network addresses are not allowed.");
    return;
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !isPublicAddress(record.address))) {
    throw new Error("The manifest host must resolve only to public IP addresses.");
  }
}

async function fetchManifest(input: string): Promise<{ manifest: Manifest; finalUrl: string }> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid manifest URL.");
  }

  for (let redirects = 0; redirects <= 3; redirects++) {
    await validateDestination(url);
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json", "User-Agent": "AFTERFRAME-Addon-Installer/1.0" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) throw new Error("The manifest redirected too many times.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`The add-on server returned HTTP ${response.status}.`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 1_000_000) throw new Error("The manifest is larger than the 1 MB limit.");
    const body = await response.text();
    if (body.length > 1_000_000) throw new Error("The manifest is larger than the 1 MB limit.");

    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error("The URL did not return a valid JSON manifest.");
    }
    if (!data || typeof data !== "object") throw new Error("The manifest must be a JSON object.");
    const value = data as Record<string, unknown>;
    if (
      typeof value.id !== "string" || !value.id.trim() ||
      typeof value.version !== "string" || !value.version.trim() ||
      typeof value.name !== "string" || !value.name.trim() ||
      !Array.isArray(value.resources) ||
      !Array.isArray(value.types)
    ) {
      throw new Error("This does not look like a compatible Stremio add-on manifest.");
    }
    if (value.resources.length > 100 || value.types.length > 100) {
      throw new Error("The manifest contains too many resources or content types.");
    }
    const manifest: Manifest = {
      id: value.id.slice(0, 200),
      version: value.version.slice(0, 40),
      name: value.name.slice(0, 120),
      description: typeof value.description === "string" ? value.description.slice(0, 1000) : undefined,
      logo: typeof value.logo === "string" && value.logo.startsWith("https://") ? value.logo.slice(0, 1000) : undefined,
      resources: value.resources as Manifest["resources"],
      types: value.types.filter((item): item is string => typeof item === "string").slice(0, 100),
      catalogs: Array.isArray(value.catalogs) ? value.catalogs.slice(0, 100) as Manifest["catalogs"] : [],
      idPrefixes: Array.isArray(value.idPrefixes) ? value.idPrefixes.filter((item): item is string => typeof item === "string").slice(0, 100) : [],
      behaviorHints: value.behaviorHints && typeof value.behaviorHints === "object" ? value.behaviorHints as Record<string, unknown> : undefined,
    };
    return { manifest, finalUrl: url.toString() };
  }
  throw new Error("Unable to retrieve this manifest.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body.url !== "string" || body.url.length > 2048) {
      return NextResponse.json({ error: "Provide a manifest URL (up to 2,048 characters)." }, { status: 400 });
    }
    const result = await fetchManifest(body.url);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to install this add-on.";
    const status = message.includes("Use a secure") || message.includes("not allowed") || message.includes("public IP") ? 400 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
