import {
  UserAgent,
  Registerer,
  RegistererState,
  Inviter,
  SessionState,
} from "sip.js";

const ASTERISK_WS  = "wss://192.168.1.94:8089/ws";
const ASTERISK_IP  = "192.168.1.94";

// --- DOM refs ---
const statusEl       = document.getElementById("status");
const registerBtn    = document.getElementById("registerBtn");
const extensionInput = document.getElementById("extensionInput");
const passwordInput  = document.getElementById("passwordInput");
const callBtn    = document.getElementById("callBtn");
const hangupBtn  = document.getElementById("hangupBtn");
const answerBtn  = document.getElementById("answerBtn");
const rejectBtn  = document.getElementById("rejectBtn");
const targetEl   = document.getElementById("target");
const incomingEl = document.getElementById("incoming");
const callerEl   = document.getElementById("caller");
const remoteAudio= document.getElementById("remoteAudio");
const logEl      = document.getElementById("log");

let ua, registerer, currentSession;

function log(msg) {
  const line = document.createElement("div");
  line.textContent = `${new Date().toISOString().substr(11,8)} ${msg}`;
  logEl.prepend(line);
}

function setStatus(text, color = "black") {
  statusEl.textContent = text;
  statusEl.style.color = color;
}

// Attach remote audio stream to <audio> element
function attachRemoteAudio(session) {
  const pc = session.sessionDescriptionHandler?.peerConnection;
  if (!pc) return;
  pc.ontrack = (event) => {
    if (event.track.kind === "audio") {
      remoteAudio.srcObject = new MediaStream([event.track]);
      log("Remote audio attached");
    }
  };
  // Attach already-existing tracks (re-invite case)
  pc.getReceivers().forEach((r) => {
    if (r.track?.kind === "audio") {
      remoteAudio.srcObject = new MediaStream([r.track]);
    }
  });
}

function handleSessionState(session) {
  session.stateChange.addListener((state) => {
    log(`Session state: ${state}`);
    switch (state) {
      case SessionState.Establishing:
        setStatus("Calling...", "orange");
        break;
      case SessionState.Established:
        setStatus("In call", "green");
        callBtn.disabled   = true;
        hangupBtn.disabled = false;
        attachRemoteAudio(session);
        break;
      case SessionState.Terminated:
        setStatus("Registered", "green");
        callBtn.disabled   = false;
        hangupBtn.disabled = true;
        incomingEl.style.display = "none";
        currentSession = null;
        log("Call ended");
        break;
    }
  });
}

// --- Register ---
registerBtn.addEventListener("click", () => {
  if (ua) {
    log("Already started");
    return;
  }

  const EXTENSION = extensionInput.value.trim();
  const PASSWORD  = passwordInput.value;

  if (!EXTENSION || !PASSWORD) {
    log("Extension and password are required");
    return;
  }

  const uri = UserAgent.makeURI(`sip:${EXTENSION}@${ASTERISK_IP}`);

  ua = new UserAgent({
    uri,
    transportOptions: { server: ASTERISK_WS },
    authorizationUsername: EXTENSION,
    authorizationPassword: PASSWORD,
    sessionDescriptionHandlerFactoryOptions: {
      peerConnectionConfiguration: {
        iceServers: [],          // LAN only — no STUN needed
        iceTransportPolicy: "all",
      },
    },
    // Handle incoming calls
    delegate: {
      onInvite: (invitation) => {
        log(`Incoming call from ${invitation.remoteIdentity.uri.user}`);
        currentSession = invitation;
        callerEl.textContent = invitation.remoteIdentity.uri.user;
        incomingEl.style.display = "block";
        handleSessionState(invitation);
      },
    },
  });

  ua.start()
    .then(() => {
      log("Transport connected");
      registerer = new Registerer(ua);

      registerer.stateChange.addListener((state) => {
        log(`Registerer state: ${state}`);
        if (state === RegistererState.Registered) {
          setStatus("Registered", "green");
          registerBtn.disabled    = true;
          extensionInput.disabled = true;
          passwordInput.disabled  = true;
          callBtn.disabled        = false;
        } else if (state === RegistererState.Unregistered) {
          setStatus("Unregistered", "red");
        }
      });

      return registerer.register();
    })
    .catch((err) => {
      log(`Error: ${err}`);
      setStatus("Error", "red");
    });
});

// --- Make call ---
callBtn.addEventListener("click", () => {
  const target = targetEl.value.trim();
  if (!target || !ua) return;

  const targetUri = UserAgent.makeURI(`sip:${target}@${ASTERISK_IP}`);
  const inviter = new Inviter(ua, targetUri, {
    sessionDescriptionHandlerOptions: {
      constraints: { audio: true, video: false },
    },
  });

  currentSession = inviter;
  handleSessionState(inviter);
  inviter.invite().catch((err) => log(`Invite error: ${err}`));
  log(`Calling ${target}...`);
});

// --- Hang up ---
hangupBtn.addEventListener("click", () => {
  if (!currentSession) return;
  switch (currentSession.state) {
    case SessionState.Initial:
    case SessionState.Establishing:
      currentSession.cancel();
      break;
    case SessionState.Established:
      currentSession.bye();
      break;
    default:
      break;
  }
});

// --- Answer incoming ---
answerBtn.addEventListener("click", () => {
  if (!currentSession) return;
  currentSession.accept({
    sessionDescriptionHandlerOptions: {
      constraints: { audio: true, video: false },
    },
  });
  incomingEl.style.display = "none";
});

// --- Reject incoming ---
rejectBtn.addEventListener("click", () => {
  if (!currentSession) return;
  currentSession.reject();
  incomingEl.style.display = "none";
  currentSession = null;
});
