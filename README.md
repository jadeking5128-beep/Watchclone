# AFTERFRAME (Watchclone)

A cinematic discovery and playback platform with an extensible catalogue and add-on ecosystem.

## Current status

The first UI foundation is in place: responsive cinematic landing/discovery page, curated demo titles, local search, saved-title interactions, and a visual add-on entry point. Demo catalogue data is illustrative; no streaming sources or third-party integrations are connected yet.

## Product roadmap

1. Metadata provider integration and real catalogue search.
2. Stremio-compatible manifest URL importer and add-on management.
3. Stream-source discovery and legal-source playback adapters.
4. HLS/DASH player, subtitles, audio tracks, resume and episode progression.
5. IntroDB integration where supported by available metadata/API access.
6. User library, watch history, and optional Trakt/Simkl sync.

## Development

- Node.js 20+
- `npm install`
- `npm run dev`

## Architecture notes

A manifest URL describes an add-on interface; it is not itself a playable video URL. The app will validate add-on manifests, request catalogues/streams through compatible adapters, and pass supported media URLs to the player. Browser-hosted Vercel functions are not a persistent torrent client, so torrent playback requires a separately hosted, authorized playback engine. This project is intended for content the user is authorized to access.
