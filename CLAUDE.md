# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

https://github.com/proquecosta/claude-playground.git

**Branching convention for spec-driven work:**
- `main` — stable, spec-complete code only
- `spec/<name>` — branch per feature spec while in progress

## Commands

**Build the client bundle:**
```bash
npx esbuild app.js --bundle --outfile=bundle.js
```

**Run the HTTPS server:**
```bash
node server.js
```
Requires TLS certs at `/etc/asterisk/keys/integration/` (`webserver.crt` and `webserver.key`). Serves on `https://192.168.1.94:8443`.

## Architecture

This is a browser-based SIP softphone that registers with an Asterisk PBX and handles audio calls over WebRTC.

### Signal flow

```
Browser (sip.js)  <--WSS-->  Asterisk (:8089/ws)  <--SIP-->  Other extensions
                  <--RTP-->  Asterisk              <--RTP-->  (audio media)
```

- `app.js` — all client logic: UA setup, registration, outbound/inbound call handling, DOM wiring
- `bundle.js` — esbuild output of `app.js`; what `index.html` actually loads
- `server.js` — minimal Node HTTPS static file server (HTTPS is required for browser mic access)
- `index.html` — single-page UI with no framework

### Key sip.js objects

| Object | Role |
|---|---|
| `UserAgent` (ua) | Manages the WebSocket transport to Asterisk and owns the SIP stack |
| `Registerer` | Sends SIP REGISTER; `RegistererState` drives the UI lock/unlock |
| `Inviter` | Created per outbound call |
| `Invitation` | Received via `ua.delegate.onInvite` for inbound calls |
| `currentSession` | Module-level ref to whichever session is active (Inviter or Invitation) |

Audio is wired by attaching the remote peer connection's tracks to `<audio id="remoteAudio">` inside `attachRemoteAudio()`. The ICE config uses no STUN because all endpoints are on the same LAN.

## Spec-driven development workflow

Features and changes in this project are driven by specs before implementation. The process:

1. **Write a spec first** — create a markdown file in `specs/` describing the desired behavior, inputs/outputs, and edge cases. Specs are plain language; no code.
2. **Review the spec** — confirm the spec is complete and unambiguous before any implementation starts.
3. **Implement against the spec** — code changes are written to satisfy the spec exactly. Do not add behavior the spec does not describe.
4. **Update the spec if scope changes** — never silently diverge from the spec; amend it first, then implement.

When a task arrives without a spec, ask for one or draft one and get confirmation before writing code.
