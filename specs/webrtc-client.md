# Spec: WebRTC SIP Client (baseline)

Describes the behavior of the existing application as-built. All new specs must be consistent with or explicitly supersede sections of this document.

---

## Configuration

- Asterisk WebSocket: `wss://192.168.1.94:8089/ws`
- Asterisk SIP domain: `192.168.1.94`
- HTTPS server port: `8443`
- ICE policy: no STUN servers; LAN-only direct RTP

These values are hardcoded at build time. Changing them requires rebuilding `bundle.js`.

---

## UI States

The status indicator reflects the current SIP/call state:

| State | Text | Color |
|---|---|---|
| Initial | "Not registered" | gray |
| Registered | "Registered" | green |
| Unregistered / failed | "Unregistered" | red |
| Calling (outbound) | "Calling..." | orange |
| In call | "In call" | green |
| Error | "Error" | red |

---

## Registration

**Inputs:** extension (text), password (password field). Both are required.

**Behavior:**
- On "Register" click, a `UserAgent` connects to Asterisk over WSS and sends a SIP REGISTER.
- On success (`RegistererState.Registered`): status → "Registered"; Register button, extension, and password inputs are disabled; Call button is enabled.
- On failure: status → "Error"; inputs remain editable.
- Re-registering in the same session is not supported (clicking Register again while a UA exists is a no-op, logged as "Already started").

---

## Outbound Call

**Input:** extension number in the "Extension to call" field.

**Behavior:**
- Call button is only enabled after successful registration.
- Dialing sends a SIP INVITE to `sip:<target>@192.168.1.94`.
- Audio constraints: `{ audio: true, video: false }`.
- State progression: Establishing → "Calling..." (orange) → Established → "In call" (green).
- On Established: Call button disabled, Hang up button enabled, remote audio stream attached.
- On Terminated: status → "Registered", Call button re-enabled, Hang up button disabled.

---

## Inbound Call

**Behavior:**
- Incoming invitations are received via `ua.delegate.onInvite`.
- An incoming call banner appears showing the caller's extension.
- **Answer:** accepts with `{ audio: true, video: false }`. Banner hides. Call proceeds as established session.
- **Reject:** sends SIP reject. Banner hides. `currentSession` cleared.
- Only one concurrent session is tracked (`currentSession`). A second incoming call while in a call is not handled.

---

## Hang Up

- Works from any active session state (Initial, Establishing, or Established).
- Establishing → `session.cancel()`
- Established → `session.bye()`
- No hang-up action is taken if there is no active session.

---

## Audio

- Remote audio plays automatically via `<audio autoplay>`.
- Local microphone is requested by the browser at call setup time (no pre-emptive permission request on load).
- No local audio preview or mute control exists.

---

## Logging

- A timestamped log panel displays all significant events (transport connected, registerer state changes, call state changes, errors).
- Log is prepended (newest first), capped visually at 260px with scroll.
- No log persistence across page reloads.

---

## Out of scope (not implemented)

- DTMF / keypad
- Hold / transfer
- Video
- Multiple simultaneous calls
- Unregister / logout
- Ringtone for inbound calls
- STUN/TURN (WAN calls)
