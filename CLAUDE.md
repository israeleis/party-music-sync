# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run all builds
pnpm build

# Run a single package's commands
pnpm -F @partylight/core test
pnpm -F @partylight/web dev         # Vite dev server
pnpm -F @partylight/web build
pnpm -F @partylight/server dev      # tsx watch (auto-reload)
pnpm -F @partylight/server start    # production
pnpm -F @partylight/mobile start    # Expo (QR code)
pnpm -F @partylight/mobile android
pnpm -F @partylight/mobile ios
```

## Architecture

Partylight is a music-reactive lighting app. A host device analyzes audio and broadcasts color data; peer devices display synchronized light effects.

**Packages:**
- `@partylight/core` — shared logic: audio analysis, color generation, WebSocket sync. Zero dependencies, pure TypeScript.
- `@partylight/web` — Vite + React browser app
- `@partylight/server` — Node.js WebSocket relay server (port 8765)
- `@partylight/mobile` — Expo + React Native iOS/Android app (Skia rendering)

**Data flow:**
```
Audio input → useAudioAnalyzer → BandProcessor → ColorEngine → ColorState
                                                                    ↓
                                                     SyncManager (WebSocket host)
                                                                    ↓
                                                         Server relays to peers
                                                                    ↓
                                                     Theme component renders color
```

**Core classes:**
- `BandProcessor` — FFT (2048) → bass/mid/treble bands + adaptive beat detection
- `ColorEngine` — maps bands to RGB with 50ms lerp and beat flash
- `SyncManager` — WebSocket client; roles: `'host'` (broadcasts) or `'peer'` (receives). Auto-reconnect with exponential backoff.
- `ColorState` — the shared data type passed everywhere: `{ r, g, b, beat, intensity, timestamp }`

**Module resolution for `@partylight/core`:**
- Web (Vite): alias in `vite.config.ts` → `../core/src/index.ts`
- Mobile (Metro): `extraNodeModules` in `metro.config.js` → `../core/src/index.ts`
- Server: direct workspace import

## Mobile-specific notes

- Audio uses `expo-audio` (not `expo-av` — deprecated in SDK 54). The hook polls `recorder.getStatus().metering` at 30fps and derives approximate band values from a single dBFS level (no FFT on mobile).
- Themes render via `@shopify/react-native-skia`. The canvas requires a manual redraw loop — see `AnimatedCanvas.tsx`.
- `react-native-reanimated` is a peer dependency of Skia but must NOT be initialized at module load. A stub in `packages/mobile/src/fake-reanimated/` intercepts Skia's `createWorkletRuntime` call. This is mapped in `metro.config.js`.
- 'Speaker' audio source is not supported on mobile — both source modes use the microphone.
- Server URL is configured via `EXPO_PUBLIC_PARTYLIGHT_SERVER_URL` env var.

## Server

- Rooms: max 100 concurrent, 10 peers each, 1-hour expiry, 60 FPS host rate limit
- `GET /rooms` — lists discoverable rooms (polled by clients every 3s for room discovery)
- Room codes: 4-character uppercase (no O/I to avoid confusion)
