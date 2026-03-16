# Partylight — Design Spec
**Date:** 2026-03-15

## Overview
Partylight is a cross-platform app that changes the screen's colors in real time based on music being played. All devices listening to the same music display the same colors simultaneously, even if each device uses a different visual theme. Users choose from 5 visual themes; the color output is always synchronized.

---

## Platform Split
- **Mobile (Android + iOS):** React Native with Expo
- **Desktop (Mac, Linux, Windows):** Web PWA (Vite + React, runs in any modern browser)
- **Sync relay server:** Node.js + WebSocket (lightweight, self-hostable)

---

## Monorepo Structure
```
partylight/
├── packages/
│   ├── core/       # Pure TypeScript — audio analysis, color engine, sync protocol
│   ├── mobile/     # Expo React Native app
│   ├── web/        # Vite React PWA
│   └── server/     # WebSocket relay server (Node.js)
├── pnpm-workspace.yaml
└── package.json
```

Tooling: **pnpm workspaces**, TypeScript throughout, ESLint + Prettier.

---

## Core Package

### Audio Input
- **Web:** Web Audio API (`getUserMedia` for mic, `getDisplayMedia` for system audio where supported)
- **Mobile:** `expo-av` for mic; system audio capture on Android where available, not supported on iOS
- Mic is the primary universal input; speaker capture is a best-effort bonus
- **iOS fallback:** The audio source toggle shows "Mic only" on iOS; the speaker option is hidden (not grayed out). A tooltip explains this is an iOS system limitation.

### Audio Analyzer
- FFT size: 2048 samples, run at ~60fps via `requestAnimationFrame` / `setInterval`
- **Three summary bands** used for the color engine:
  - **Bass:** 20–250 Hz → Red channel
  - **Mid:** 250–4000 Hz → Green channel
  - **Treble:** 4000–20000 Hz → Blue channel
- **Full FFT bin array** (1024 bins) also exposed for the Waveform theme renderer
- Each band energy normalized to 0–1 using a rolling max over 300 frames, with a hard floor of `0.01` to prevent division-by-zero during silence
- **Silence detection:** if RMS < 0.001 for >1 second, output `ColorState` with all channels at 0 and `beat: false`
- **Beat detection:** energy spike > 1.4× 30-frame rolling average triggers a beat. This threshold is auto-tuned: every 5 seconds, if beat rate exceeds 4 beats/sec the threshold increases by 0.05; if below 0.5 beats/sec it decreases by 0.05. Clamped to [1.2, 2.0].

### Color Engine
Maps band energies to a `ColorState` object:
```ts
type ColorState = {
  r: number          // 0–255 (bass energy)
  g: number          // 0–255 (mid energy)
  b: number          // 0–255 (treble energy)
  beat: boolean      // true on beat frame
  intensity: number  // 0–1 overall RMS loudness
  timestamp: number  // ms since epoch, for peer interpolation
}
```
On beat frames, all channels are boosted toward 255 (white flash) for exactly 2 render frames, then lerp back. Smooth interpolation (lerp factor 0.15 per frame) prevents flickering between non-beat frames.

---

## Network Sync

### WebSocket Protocol
The server exposes a single WebSocket endpoint. After upgrading the HTTP connection, clients send a JSON handshake message to declare their role:

```
// Create a room (server generates code and responds)
→ { "type": "create" }
← { "type": "created", "code": "JAZZ" }

// Join as peer
→ { "type": "join", "code": "JAZZ" }
← { "type": "joined" } | { "type": "error", "reason": "not_found" }

// Host publishes ColorState frames (30fps)
→ { "type": "frame", "state": ColorState }

// Server relays to all peers in the room
← { "type": "frame", "state": ColorState }

// Room expiry notification
← { "type": "expired" }
```

All messages are JSON. Binary (MessagePack) may be added in v2 if bandwidth is a concern — 30fps × ~100 bytes/frame = ~3KB/s, acceptable for v1.

### Frame Rate & Interpolation
- Host broadcasts `ColorState` at **30fps**
- Peers render at **60fps** using linear interpolation between the last two received frames, using `timestamp` to determine blend factor
- If no new frame arrives within 100ms, the peer holds the last received state
- If no frame arrives for 3 seconds, the peer falls back to audio-only mode and shows a "Lost sync" toast

### Room Code Generation
- The **server** generates room codes: 4 uppercase letters, excluding ambiguous characters (O, I, 0, 1)
- Uniqueness enforced in memory (active rooms map). On collision (rare), server retries up to 5 times, then returns an error
- Room codes are case-insensitive on input

### Device Discovery
- **mDNS (mobile only):** `react-native-zeroconf` for both advertising (host) and discovery (peers). Host advertises `_partylight._tcp` service on port 8765 using `react-native-zeroconf`'s `publishService` API. Peer devices scan continuously and display discovered hosts as a list; tapping an entry joins the room automatically (no manual code entry needed for LAN peers).
- **Web browser limitation:** Browsers cannot do mDNS. Instead, web clients use **server-assisted discovery**: when a host creates a room, it optionally marks it as "discoverable." The relay server maintains a list of discoverable rooms; web peers poll `GET /rooms` every 3 seconds. Response shape: `[{ code: string, peerCount: number, createdAt: number }]`. Rooms marked non-discoverable are excluded.
- **Room code (all platforms):** Always available as a manual fallback.

### Server Rate Limiting & Abuse Prevention
- Max 100 active rooms at a time; new room creation returns 503 if exceeded
- Max 10 peers per room
- Host publish rate limited to 60 frames/sec; excess frames dropped
- Rooms expire after 1 hour of no host frames
- No authentication required (ephemeral, no user data stored)

### Reconnection
- Client WebSocket reconnects with exponential backoff (1s, 2s, 4s, max 30s) on disconnect
- After reconnecting, client re-sends the same `join` or `create` handshake
- If the room has expired, the user sees a "Room ended" dialog with option to create a new one

---

## Visual Themes

All themes receive `ColorState` every frame. Color values are always identical across devices in the same room. Each device independently persists its chosen theme locally.

| # | Name | Description | Animation driver |
|---|------|-------------|-----------------|
| 1 | **Geometric** | Rotating polygons (triangle, hexagon, etc.) that scale and rotate | Scale on beat, rotation speed from intensity |
| 2 | **Fluid/Blob** | Smooth organic blobs morphing via simplex noise | Morph speed from intensity, glow on beat |
| 3 | **Particles** | Sparks/dots emitted from center outward | Emission rate from intensity, burst on beat |
| 4 | **Waveform** | Classic spectrum analyzer bars using the full FFT bin array (1024 bins collapsed to ~64 display bars) | Bar height from per-bin energy, color from RGB bands |
| 5 | **Solid Wash** | Full-screen color fill with smooth transitions | Lerp speed from intensity, flash on beat |

**Beat flash on peers:** The `beat: true` flag triggers a 2-frame white flash starting from the frame it is first rendered, regardless of network delay. Peers deduplicate beat events by `timestamp` — a `beat: true` frame with the same timestamp as the previous received frame is ignored, preventing double-flash when interpolation replays it. Beat flashes may be up to ~33ms late relative to the host — acceptable for a party context.

**Rendering:**
- Web: HTML5 Canvas API, `requestAnimationFrame` loop
- Mobile: React Native Skia (`@shopify/react-native-skia`) for canvas, React Native Reanimated for beat flash overlays

**Theme picker:** Horizontal swipeable carousel shown at app launch and accessible via a floating settings button during playback. Selection persisted in `AsyncStorage` (mobile) / `localStorage` (web).

---

## UI / UX

- **Launch screen:** Theme picker (swipeable cards previewing each theme with a looping demo animation using fake `ColorState` data)
- **Main screen:** Full-screen visual renderer. Floating top-right button opens sync panel.
- **Sync panel (slide-up drawer):**
  - Toggle: Audio-only / Network sync
  - Audio source toggle: Mic / Speaker (Speaker hidden on iOS)
  - If network sync: list of discovered rooms (auto) + "Create room" button + "Join with code" text input
  - Active room shows code prominently for sharing
- **"Lost sync" toast:** shown when peer hasn't received a frame in 3s; auto-dismisses when sync resumes
- **No accounts, no sign-in.** Room codes are ephemeral.

---

## Sync Server

Minimal Node.js WebSocket server:
- Single WebSocket endpoint (`ws://host/`) with JSON message protocol (see above)
- Server URL configured via environment variable `PARTYLIGHT_SERVER_URL` in both mobile and web clients. Default: `wss://relay.partylight.app` (production). Local dev override: `ws://localhost:8765`.
- `GET /rooms` REST endpoint returns list of discoverable rooms (for web browser discovery)
- In-memory room map; no database
- Rooms auto-expire after 1 hour idle
- Deployable as a single Docker container
- Environment variable `MAX_ROOMS=100` (default)

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Language | TypeScript (all packages) |
| Mobile | Expo SDK, React Native Skia, Reanimated |
| Web | Vite, React, Canvas API |
| Audio (web) | Web Audio API |
| Audio (mobile) | expo-av |
| Sync | WebSocket (`ws` library on server, native WS on clients) |
| Discovery (mobile) | react-native-zeroconf (advertise + discover) |
| Discovery (web) | Server-assisted via `GET /rooms` polling |
| Server | Node.js + ws, Docker |

---

## Out of Scope (v1)
- User accounts or saved rooms
- Custom color mapping configuration
- Beat-synced haptic feedback
- Lyrics or song identification
- Background mode on iOS (Apple restriction)
- Binary frame encoding (MessagePack) — plain JSON is sufficient at 30fps
