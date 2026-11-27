export type AddonManifest = {
  id: string;
  version: string;
  name: string;
  description?: string;
  logo?: string;
  resources: Array<string | { name: string; types?: string[]; idPrefixes?: string[] }>;
  types: string[];
  catalogs?: Array<{ type: string; id: string; name?: string }>;
  idPrefixes?: string[];
};

export type InstalledAddon = {
  manifest: AddonManifest;
  manifestUrl: string;
  installedAt: string;
};
