# Partylight

Music-reactive lighting app. One device analyzes audio and broadcasts color data in real time; other devices join the room and display synchronized light effects.

**Packages:**
- `packages/core` — shared audio analysis, color engine, and sync logic
- `packages/web` — browser app (Vite + React)
- `packages/server` — WebSocket relay server (Node.js)
- `packages/mobile` — iOS/Android app (Expo + React Native + Skia)

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 10.32+ — `npm install -g pnpm`
- **Expo CLI** (mobile only) — `npm install -g expo-cli`
- **iOS**: Xcode + Simulator, or physical device with Expo Go
- **Android**: Android Studio + Emulator, or physical device with Expo Go

---

## Setup

```bash
git clone <repo>
cd partylight
pnpm install
```

---

## Running locally

All three parts (server, web, mobile) can run independently or together.

### 1. Relay Server

The server relays color frames between host and peer devices.

```bash
pnpm -F @partylight/server dev
# Listening on ws://localhost:8765
```

To change the port:
```bash
PORT=9000 pnpm -F @partylight/server dev
```

### 2. Web App

```bash
pnpm -F @partylight/web dev
# Opens at http://localhost:5173
```

By default the web app points to `https://relay.partylight.app`. To use your local server, create `packages/web/.env.local`:

```env
VITE_PARTYLIGHT_SERVER_URL=ws://localhost:8765
```

### 3. Mobile App

```bash
pnpm -F @partylight/mobile start
# Scan the QR code with Expo Go (iOS/Android)
```

To target a specific platform:
```bash
pnpm -F @partylight/mobile ios       # iOS Simulator
pnpm -F @partylight/mobile android   # Android Emulator
```

To point mobile at your local server, create `packages/mobile/.env`:

```env
EXPO_PUBLIC_PARTYLIGHT_SERVER_URL=ws://192.168.x.x:8765
```

> Use your machine's local network IP (not `localhost`) so physical devices can reach the server.

---

## How it works

1. **Host** — open the app on the device with audio. Select a theme, tap the sync button (⚡), and create a room. A 4-character room code is shown.
2. **Peers** — open the app on other devices. Tap sync, enter the room code (or pick a discoverable room from the list). The display mirrors the host's colors in real time.

Audio sources on web:
- **Mic** — microphone input
- **Speaker** — system audio via screen capture (browser prompts for permission)

On mobile, both modes use the microphone (the mic picks up room audio).

---

## Development

```bash
# Run all tests
pnpm test

# Run tests for a single package
pnpm -F @partylight/core test
pnpm -F @partylight/web test
pnpm -F @partylight/server test

# Build everything
pnpm build
```

---

## Project structure

```
packages/
  core/     — BandProcessor, ColorEngine, SyncManager, shared types
  web/      — Vite app: hooks/, components/, themes/
  server/   — roomManager.ts, wsHandler.ts, restRouter.ts
  mobile/   — Expo app: hooks/, components/, themes/ (Skia)
```

Core data type passed everywhere:
```ts
type ColorState = { r: number; g: number; b: number; beat: boolean; intensity: number; timestamp: number }
```
