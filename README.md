# AFTERFRAME (Watchclone)

A cinematic discovery platform with an extensible catalogue and add-on ecosystem.

## Current status

The responsive AFTERFRAME discovery experience is in place, including a curated demo collection, local title search, and saved-title interactions.

**Add-on phase:** the app now includes a Stremio-compatible manifest URL installer and add-on manager. The server validates HTTPS URLs, blocks local/private destinations, checks redirects, applies a request timeout, limits manifest size, and verifies the required manifest fields before returning add-on metadata. Installed add-ons can be reviewed and removed from the manager.

The installed add-on list is currently stored in the browser's local storage. It is not synced between devices. Add-on catalogue and stream resources are not yet wired into the discovery grid or player, and the film collection remains illustrative demo data.

## Product roadmap

1. Metadata provider integration and real catalogue search.
2. Stremio-compatible manifest URL importer and add-on management — initial implementation complete.
3. Compatible catalogue and stream resource adapters, with source discovery for content the user is authorized to access.
4. HLS/DASH player, subtitles, audio tracks, resume and episode progression.
5. IntroDB integration where supported by available metadata/API access.
6. Cloud-synced user library, watch history, and optional Trakt/Simkl sync.

## Development

- Node.js 20+
- `npm install`
- `npm run dev`

## Manifest installer notes

- Accepts HTTPS manifest URLs on the standard HTTPS port.
- Rejects credentials in URLs, local hostnames, private/reserved IP destinations, and non-standard ports.
- Re-validates each redirect destination and limits redirects to three.
- Uses an eight-second timeout and a 1 MB manifest limit.
- Requires the core Stremio manifest fields: `id`, `version`, `name`, `resources`, and `types`.

Only install add-ons from sources you trust. Manifest validation confirms the expected shape; it does not certify an add-on's safety, accuracy, or content rights.

## Architecture notes

A manifest URL describes an add-on interface; it is not itself a playable video URL. The next integration step is to request catalogues and streams through compatible adapters, then pass supported media URLs to the player. Browser-hosted Vercel functions are not a persistent torrent client, so torrent playback requires a separately hosted, authorized playback engine. This project is intended for content the user is authorized to access.
