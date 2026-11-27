# AFTERFRAME (Watchclone)

A cinematic discovery platform with an extensible catalogue and add-on ecosystem.

## Current status

The responsive AFTERFRAME discovery experience now loads real metadata from compatible Stremio catalogues instead of relying on a hardcoded demo-film list.

**Catalogue discovery phase:** the server reads add-on manifests, discovers declared catalogues, retrieves title metadata, and supports remote search when a catalogue declares the `search` extra. Results are normalized into the existing cinematic shelves and Discover grid. Search is also applied locally to the titles already loaded.

**Add-on phase:** the app includes a Stremio-compatible manifest URL installer and add-on manager. The server validates HTTPS URLs, blocks local/private destinations, re-checks redirects, applies request timeouts, limits response sizes, and verifies required manifest fields. No third-party playback or stream providers are bundled. Custom catalogue-only add-on installation and removal remain administrator-only.

The add-on list and saved titles are currently browser-local; they persist across refreshes on the same browser but are not synced between devices. Add-ons that declare only non-catalogue resources do not populate the discovery shelves. This phase handles catalogue metadata only; it does not resolve streams or play video. Selecting a title opens a detailed dossier with source attribution and an explicit playback-availability state. No verified official playback provider is currently connected.

## Product roadmap

1. Metadata provider integration and real catalogue discovery — initial implementation complete.
2. Stremio-compatible manifest importer and add-on management — initial implementation complete.
3. Title detail dossier and playback availability foundation — implemented. Actual provider handoff remains pending verified official-provider integration.
4. HLS/DASH player, subtitles, audio tracks, resume and episode progression.
5. IntroDB integration where supported by available metadata/API access.
6. Cloud-synced user library, watch history, and optional Trakt/Simkl sync.

## Administrator setup

The Vercel project uses these environment variables:

- `AFTERFRAME_ADMIN_PASSWORD_HASH`: a salted scrypt password hash. The plaintext password is not stored in Vercel.
- `AFTERFRAME_SESSION_SECRET`: a cryptographically random signing secret of at least 32 characters, used for seven-day HTTP-only admin sessions.

Both variables must be present for administrator sign-in. The admin session is checked server-side for protected add-on installation requests. Do not commit secrets or paste them into source files.

## Development

- Node.js 20+
- `npm install`
- `npm run dev`

## Catalogue API notes

- Reads the manifest's declared `catalogs` and `resources`.
- Requests `/catalog/{type}/{id}.json` for supported catalogues.
- Uses the `search` catalogue extra only when the add-on declares it.
- Caps response sizes and item counts, uses request timeouts, and re-validates HTTPS destinations and redirects.
- Rejects local/private network destinations, credentials in URLs, and non-standard HTTPS ports.

Manifest validation checks expected structure and network boundaries; it accepts catalogue metadata resources only and strips all other capabilities. It does not certify a source's accuracy or content rights. Only use sources you trust and metadata you are authorized to access.

## Architecture notes

A manifest describes an add-on interface; it is not a playable video URL. Catalogue discovery and playback are separate systems. This release only loads catalogue metadata. Stream resolution, playback, subtitles, and cross-device synchronization remain future phases. AFTERFRAME will only add playback integrations for verified, authorized providers; it will not resolve torrent or unverified third-party streams.
