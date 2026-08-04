# Share Anything Anywhere

A LocalSend-style file sharing web app. Devices on the same network find each
other automatically on a radar-style screen; drop a file on a device to send
it straight to it over a peer-to-peer WebRTC connection. Files never pass
through the server — it only helps two browsers find and talk to each other
(this is called "signaling").

## How it works

- **Discovery**: when you open the app, the server groups you with other
  visitors coming from the same IP address — effectively "the same network,"
  the web equivalent of LocalSend's local-network discovery.
- **Cross-network invites**: click **Invite** to generate a short code (and
  QR code). Anyone who opens the link joins your group regardless of which
  network they're on — handy for sharing with someone who isn't on your Wi-Fi.
- **Transfer**: drop a file on a device (or click it to pick a file), the
  receiving device approves the request, and the two browsers open a direct
  WebRTC data channel to move the bytes.

## Requirements

- Node.js 18 or newer

## Setup

```bash
npm run install-all
```

This installs dependencies for both the `server` and `client` folders.

## Run it locally

```bash
npm run dev
```

This starts the signaling server on `http://localhost:3001` and the client
dev server on `http://localhost:5173`. Open the client URL in two browser
tabs (or two devices on the same Wi-Fi, pointed at your machine's LAN IP) to
see them discover each other.

## Deploy as one process

```bash
npm run build   # builds the React client
npm start        # builds again if needed, then serves everything from the server on $PORT
```

In this mode the Node server serves the built client and handles signaling
on a single port — the simplest way to put this on a host like Render,
Railway, Fly.io, or a small VPS. Because signaling goes over WebSockets, use
a host/proxy that supports WebSocket upgrades.

## Notes and limitations

- Uses public STUN servers by default, which covers the vast majority of
  home/office networks. For restrictive networks (some corporate NATs), add
  a TURN relay by copying `server/.env.example` to `server/.env` and filling
  in `TURN_URL`/`TURN_USERNAME`/`TURN_CREDENTIAL` — the client fetches the
  active ICE server list from `/ice-servers` automatically, no client
  changes needed.
- Transfers are one active file batch per device pair at a time — plenty for
  personal use, but not designed for many-simultaneous-transfer scenarios.
- All state is in memory; restarting the server clears active rooms (no
  database is used or needed).

## Reliability

- Stale peers (closed tab, dead Wi-Fi) drop off the radar within seconds —
  the server uses a short ping/pong timeout and broadcasts disconnects
  immediately, and any transfer in progress with that peer fails fast with
  a clear message instead of hanging.
- An unanswered transfer request times out after 45 seconds instead of
  sitting on the sender's screen forever.
- Failed and declined sends can be retried with one tap; pending or active
  sends can be cancelled the same way.
- Large files stream in bounded-memory chunks with backpressure, and
  progress/speed/ETA updates are throttled so the UI stays smooth even on
  very large transfers.
- Closing or refreshing the tab mid-transfer prompts a confirmation first.

## Mobile

- Fully responsive down to small phone screens: a compact icon-only header,
  a radar that scales to the viewport, and bottom-sheet modals (transfer
  approval, settings) instead of small centered popups.
- Respects iOS/Android safe areas (notches, home indicators) and can be
  added to a home screen as a standalone app (manifest + icon included).
