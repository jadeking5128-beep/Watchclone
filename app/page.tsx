"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Search, Play, Plus, ChevronRight, SlidersHorizontal, Bookmark, Sparkles,
  X, ArrowUpRight, Puzzle, ShieldCheck, Trash2, ExternalLink, LoaderCircle,
} from "lucide-react";
import type { InstalledAddon } from "@/lib/addons";

const films = [
  { id: 1, title: "Dune: Part Two", year: "2024", kind: "SCI-FI · ADVENTURE", rating: "8.5", time: "2h 46m", image: "https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: 2, title: "The Batman", year: "2022", kind: "CRIME · DRAMA", rating: "7.8", time: "2h 56m", image: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg" },
  { id: 3, title: "Interstellar", year: "2014", kind: "SCI-FI · DRAMA", rating: "8.7", time: "2h 49m", image: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: 4, title: "Blade Runner 2049", year: "2017", kind: "SCI-FI · MYSTERY", rating: "8.0", time: "2h 44m", image: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg" },
  { id: 5, title: "Oppenheimer", year: "2023", kind: "DRAMA · HISTORY", rating: "8.3", time: "3h 00m", image: "https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg" },
  { id: 6, title: "Arrival", year: "2016", kind: "SCI-FI · DRAMA", rating: "7.9", time: "1h 56m", image: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg" },
];
const categories = ["For you", "Movies", "Series", "Documentaries", "Animation"];
const STORAGE_KEY = "afterframe.addons.v1";
const suggestedAddons = [
  { name: "BTTTR catalogue", url: "https://btttr.cc/TYxBDoMwDAT_4nP6gXyg96q3qgcLrBQpxNR2VCHE36sEAtzGs-tdoEPDyEHBvyCikdptBNdQwYFxj3OVG50OwUHH45BCjXfUE0vBhFLfKsdRShNPOaLUoPE2PsHbwUiG4Je1hGok4JcaecBsXH6Eg5AqeJNM-_gTwyG-GeNg81Xph393SkJX8UAbUmgGA13Fuv4B/manifest.json" },
  { name: "RFNX catalogue", url: "https://fun.rfnx.workers.dev/manifest.json" },
  { name: "Netflix catalogue", url: "https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json" },
];

export default function Home() {
  const [active, setActive] = useState("For you");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [manifestUrl, setManifestUrl] = useState("");
  const [addons, setAddons] = useState<InstalledAddon[]>([]);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [adminConfigured, setAdminConfigured] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { setAdminConfigured(Boolean(data.configured)); setAdminAuthenticated(Boolean(data.authenticated)); })
      .catch(() => setAdminConfigured(false));
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAddons(JSON.parse(stored) as InstalledAddon[]);
    } catch {
      setAddons([]);
    }
  }, []);

  const filtered = useMemo(
    () => films.filter((film) => film.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const toggleSave = (id: number) =>
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  function persistAddons(next: InstalledAddon[]) {
    setAddons(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setInstallError("This browser could not save your add-on list.");
    }
  }

  async function loginAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminBusy(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Admin sign-in failed.");
      setAdminAuthenticated(true);
      setAdminPassword("");
      setAdminError("");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Admin sign-in failed.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function logoutAdmin() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAdminAuthenticated(false);
    setAdminPassword("");
  }

  async function installAddon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInstalling(true);
    setInstallError("");
    try {
      const response = await fetch("/api/addons/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: manifestUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read this manifest.");
      const installed: InstalledAddon = {
        manifest: result.manifest,
        manifestUrl: result.finalUrl,
        installedAt: new Date().toISOString(),
      };
      const next = [installed, ...addons.filter((item) => item.manifest.id !== installed.manifest.id)];
      persistAddons(next);
      setManifestUrl("");
      setInstallError("");
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : "Could not install this add-on.");
    } finally {
      setInstalling(false);
    }
  }

  function removeAddon(id: string) {
    persistAddons(addons.filter((item) => item.manifest.id !== id));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">A<span>·</span></span><span>AFTERFRAME<small>YOUR CINEMA, REIMAGINED</small></span></a>
        <nav className="desktop-nav">
          <a className="nav-active">Discover</a>
          <button onClick={() => setNotice("Your saved titles are available in this browser session.")}>Library</button>
          <button onClick={() => setManagerOpen(true)}>Add-ons <span className="nav-count">{addons.length || ""}</span></button>
        </nav>
        <div className="top-actions">
          <button className="icon-btn" aria-label="Open add-ons" onClick={() => setManagerOpen(true)}><Puzzle size={18}/></button>
          <button className="profile" aria-label="Profile">T</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-image"/><div className="hero-shade"/>
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot"/> THE FEATURE PRESENTATION <span className="eyebrow-line"/></div>
          <div className="hero-kicker">A FILM BY DENIS VILLENEUVE</div>
          <h1>DUNE <i>PART TWO</i></h1><p className="hero-sub">THE DESERT IS CALLING.</p>
          <div className="hero-meta"><span>2024</span><span>SCI-FI / ADVENTURE</span><span>2H 46M</span><span className="rating">★ 8.5</span></div>
          <p className="hero-copy">Destiny is written in the sand. The next chapter of an epic journey awaits.</p>
          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => setNotice("Playback becomes available when a compatible source is connected.")}><Play size={16} fill="currentColor"/> Explore film</button>
            <button className="secondary-btn" onClick={() => toggleSave(1)}>{saved.includes(1) ? "✓ In your list" : <><Plus size={17}/> Add to list</>}</button>
          </div>
        </div>
        <div className="hero-index"><span>01</span><div/><span>04</span></div>
        <div className="hero-caption">NOW SHOWING <span>—</span> EDITION 001</div>
      </section>

      <section className="content">
        <div className="section-head"><div><div className="eyebrow muted">THE COLLECTION / 001</div><h2>Find your <i>next world.</i></h2></div><button className="text-link" onClick={() => setNotice("A live catalogue provider will be connected in the next phase.")}>View all <ArrowUpRight size={15}/></button></div>
        <div className="toolbar">
          <div className="tabs">{categories.map((category) => <button key={category} className={active === category ? "tab selected" : "tab"} onClick={() => setActive(category)}>{category}</button>)}</div>
          <div className="searchbox"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this collection"/></div>
          <button className="filter-btn" onClick={() => setNotice("Catalogue filters will arrive with metadata integration.")}><SlidersHorizontal size={16}/> Filter</button>
        </div>
        <div className="poster-grid">
          {filtered.map((film) => <article className="poster-card" key={film.id}>
            <div className="poster" style={{ backgroundImage: "url('" + film.image + "')" }}>
              <div className="poster-top"><span>{film.year}</span><button onClick={() => toggleSave(film.id)} aria-label="Save title" className={saved.includes(film.id) ? "save saved" : "save"}><Bookmark size={15} fill={saved.includes(film.id) ? "currentColor" : "none"}/></button></div>
              <div className="poster-bottom"><span>★ {film.rating}</span><button onClick={() => setNotice("Connect a compatible source to play this title.")} aria-label={"Explore " + film.title}><Play size={14} fill="currentColor"/></button></div>
            </div>
            <div className="poster-info"><div><h3>{film.title}</h3><p>{film.kind}</p></div><span className="duration">{film.time}</span></div>
          </article>)}
        </div>
        {filtered.length === 0 && <div className="empty">No titles match “{query}”. Try another search.</div>}
      </section>

      <section className="ecosystem">
        <div className="eco-icon"><Sparkles size={19}/></div>
        <div><div className="eyebrow muted">YOUR STREAMING ECOSYSTEM</div><h2>One home. <i>Every source.</i></h2><p>Install compatible catalogue and streaming add-ons with a manifest URL.</p></div>
        <button className="secondary-btn" onClick={() => setManagerOpen(true)}>Manage add-ons <ChevronRight size={16}/></button>
      </section>

      <footer><a className="brand footer-brand"><span className="brand-mark">A<span>·</span></span><span>AFTERFRAME<small>YOUR CINEMA, REIMAGINED</small></span></a><span>MADE FOR THE LOVE OF STORIES.</span><span>© 2026 AFTERFRAME</span></footer>

      {managerOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setManagerOpen(false); }}>
        <section className="addon-modal" role="dialog" aria-modal="true" aria-labelledby="addon-title">
          <div className="modal-head"><div><div className="eyebrow muted">AFTERFRAME / EXTENSIONS</div><h2 id="addon-title">Add-on <i>manager.</i></h2></div><button className="modal-close" onClick={() => setManagerOpen(false)} aria-label="Close add-on manager"><X size={19}/></button></div>
          <div className="admin-access">
            {adminAuthenticated ? (
              <div className="admin-status"><span><ShieldCheck size={15}/> ADMIN ACCESS ACTIVE</span><button type="button" onClick={logoutAdmin}>Sign out</button></div>
            ) : (
              <>
                <div className="admin-access-copy"><ShieldCheck size={17}/><div><strong>Administrator access</strong><p>{adminConfigured ? "Sign in to add or remove catalogue sources." : "Admin access is not configured yet. Add the two server environment variables in Vercel."}</p></div></div>
                {adminConfigured && <form className="admin-login" onSubmit={loginAdmin}>
                  <input type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Admin password" required />
                  <button className="secondary-btn" disabled={adminBusy}>{adminBusy ? "Checking…" : "Sign in"}</button>
                </form>}
                {adminError && <p className="form-error" role="alert">{adminError}</p>}
              </>
            )}
          </div>
          <div className="manifest-panel">
            <div className="manifest-icon"><Puzzle size={20}/></div>
            <div className="manifest-copy"><h3>Install from manifest URL</h3><p>Paste the HTTPS manifest URL supplied by a compatible Stremio add-on.</p></div>
          </div>
          {adminAuthenticated && <div className="suggested-sources">
            <div className="suggested-head"><h3>Provided sources</h3><span>ADMIN ONLY · 3 URLS</span></div>
            {suggestedAddons.map((source) => <div className="suggested-source" key={source.name}>
              <span>{source.name}</span><button type="button" onClick={() => { setManifestUrl(source.url); setInstallError(""); }}>Use URL</button>
            </div>)}
          </div>}
          {adminAuthenticated && <form className="manifest-form" onSubmit={installAddon}>
            <label htmlFor="manifest-url">MANIFEST URL</label>
            <div className="manifest-input-row"><input id="manifest-url" type="url" required value={manifestUrl} onChange={(event) => setManifestUrl(event.target.value)} placeholder="https://example.com/manifest.json"/><button className="primary-btn" disabled={installing}>{installing ? <><LoaderCircle size={15} className="spin"/> Checking</> : "Install add-on"}</button></div>
            {installError && <p className="form-error" role="alert">{installError}</p>}
          </form>}
          <div className="security-note"><ShieldCheck size={15}/><span>HTTPS only. Local/private network destinations and non-standard ports are blocked. Review an add-on's source before installing it.</span></div>
          <div className="installed-head"><h3>Installed add-ons</h3><span>{addons.length} INSTALLED</span></div>
          {addons.length === 0 ? <div className="addon-empty"><Puzzle size={23}/><p>No add-ons installed yet.</p><span>Install a compatible manifest to start building your catalogue.</span></div> :
            <div className="addon-list">{addons.map((addon) => <article className="addon-item" key={addon.manifest.id}>
              <div className="addon-avatar">{addon.manifest.logo ? <img src={addon.manifest.logo} alt="" /> : <Puzzle size={18}/>}</div>
              <div className="addon-details"><h4>{addon.manifest.name}</h4><p>{addon.manifest.description || addon.manifest.id}</p><span>v{addon.manifest.version} · {addon.manifest.types.join(", ")}</span><a href={addon.manifestUrl} target="_blank" rel="noreferrer">Manifest <ExternalLink size={11}/></a></div>
              {adminAuthenticated && <button className="remove-addon" onClick={() => removeAddon(addon.manifest.id)} aria-label={"Remove " + addon.manifest.name}><Trash2 size={16}/></button>}
            </article>)}</div>}
          <p className="storage-note">Only authenticated administrators can add or remove sources. The installed list is currently saved in this browser only; account sync is not connected yet.</p>
        </section>
      </div>}

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}
    </main>
  );
}
