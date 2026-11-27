# AFTERFRAME (Watchclone)

A cinematic discovery platform with an extensible catalogue and add-on ecosystem.

## Current status

The responsive AFTERFRAME discovery experience is in place, including a curated demo collection, local title search, and saved-title interactions.

**Add-on phase:** the app now includes a Stremio-compatible manifest URL installer and add-on manager. The server validates HTTPS URLs, blocks local/private destinations, checks redirects, applies a request timeout, limits manifest size, and verifies the required manifest fields before returning add-on metadata. Installed add-ons can be reviewed and removed from the manager.

The installed add-on list is currently stored in the browser's local storage. It is not synced between devices. Adding and removing add-ons is restricted by a signed, HTTP-only administrator session; the server independently checks this session on every install request. Add-on catalogue and stream resources are not yet wired into the discovery grid or player, and the film collection remains illustrative demo data.

## Product roadmap

1. Metadata provider integration and real catalogue search.
2. Stremio-compatible manifest URL importer and add-on management — initial implementation complete.
3. Compatible catalogue and stream resource adapters, with source discovery for content the user is authorized to access.
4. HLS/DASH player, subtitles, audio tracks, resume and episode progression.
5. IntroDB integration where supported by available metadata/API access.
6. Cloud-synced user library, watch history, and optional Trakt/Simkl sync.

## Administrator setup

Set these environment variables in Vercel for the Production environment (and Preview if needed):

- `AFTERFRAME_ADMIN_PASSWORD`: a unique, strong admin password. Do not commit it or send it in chat.
- `AFTERFRAME_SESSION_SECRET`: a cryptographically random secret of at least 32 characters, used to sign seven-day HTTP-only admin sessions.

After deployment, open Add-ons and sign in with the admin password. Without both variables, add/remove controls remain locked. The three source URLs supplied for AFTERFRAME are listed as admin-only presets; an administrator must choose and install each one. Manifest validation still applies.

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
