# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # Development build with hot reload (no browser auto-launch)
pnpm build         # Production build (auto-bumps patch version)
pnpm zip           # Package for Chrome Web Store (auto-bumps patch version)
pnpm compile       # TypeScript type-check only (no emit)
pnpm postinstall   # Run after install to generate WXT type stubs
```

- Build output goes to `output/` (Chrome MV3)
- `pnpm build` and `pnpm zip` automatically run `scripts/bump-version.mjs` (patch +1) as a pre-step
- No test suite exists in this project

## Architecture

This is a **Chrome MV3 browser extension** built with [WXT](https://wxt.dev/) + React + Tailwind v4 + Recharts.

### Extension entry points (`src/entrypoints/`)

| File | Role |
|---|---|
| `background.ts` | Service worker — opens side panel on extension icon click |
| `content.ts` | Content script on `*.xiaohongshu.com` — scrapes note cards via DOM + MutationObserver |
| `youtube-content.ts` | Content script on `*.youtube.com` — scrapes video cards from channel `/videos` pages |
| `sidepanel/` | Side panel UI (React) — shows list + trend chart, listens for messages from content scripts |
| `chart.unlisted/` | Fullscreen chart page (`chart.html`) — standalone page opened from side panel, reads data from `browser.storage.session` |

### Data flow

```
Content Script (DOM scrape)
  → browser.runtime.sendMessage (XHS_NOTES_UPDATE / YT_VIDEOS_UPDATE)
    → noteStore / youtubeStore (in side panel context)
      → React state → NoteList / LikeChart components
        → browser.storage.session (persisted for fullscreen chart page)

Side Panel → browser.tabs.sendMessage (XHS_REFRESH / YT_REFRESH)
  → Content Script clears + re-scans DOM
```

### Key design patterns

- **NoteStore / YoutubeStore** (`src/utils/`) are singleton pub/sub stores that also handle all cross-context messaging (content script ↔ side panel). They persist data to `browser.storage.session` for recovery when the side panel reopens.
- **Platform detection** (`xhs` vs `youtube`) is done at runtime in the side panel by querying the active tab URL.
- **`publishTime` for XHS**: derived from the first 8 hex characters of `noteId` (Unix seconds). Not scraped from visible text. See `src/types/note.ts:noteIdToTimestamp`.
- **`publishTime` for YouTube**: converted from relative time text (e.g. "3 days ago") at scrape time. Day-level precision only. See `src/types/youtube.ts:parseYoutubeRelativeTimeToTimestamp`.
- **WXT auto-imports**: `browser`, `defineContentScript`, `defineBackground` etc. are auto-imported globally by WXT — no explicit import needed.
- **Manifest permissions**: `sidePanel`, `storage`, `tabs` (no `activeTab` or host permissions needed; content scripts handle host access).
