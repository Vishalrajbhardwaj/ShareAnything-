import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const PROFILE_KEY = "saa-profile"; // { name, avatar } saved locally so it survives reloads (no login involved)

function getNetCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("net") || "";
}

function loadSavedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export function useSocket() {
const socketRef = useRef(null);
  const onShareDownloadRequestRef = useRef(null);
  const onChatMessageRef = useRef(null);
  const onChatTypingRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [self, setSelf] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [peers, setPeers] = useState([]);
const [netCode, setNetCode] = useState(getNetCodeFromUrl());
  const [pendingShare, setPendingShare] = useState(null);

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      query: netCode ? { net: netCode } : {},
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("joined", ({ self: serverSelf, roomId, peers, pendingShare: share }) => {
      setRoomId(roomId);
      setPeers(peers);
      if (share) {
        setPendingShare(share);
      } else {
        setPendingShare(null);
      }

      const saved = loadSavedProfile();
      if (saved && (saved.name || saved.avatar)) {
        const merged = { ...serverSelf, ...saved };
        setSelf(merged);
        socket.emit("update-profile", { name: merged.name, avatar: merged.avatar });
      } else {
        setSelf(serverSelf);
      }
    });

socket.on("share-updated", (share) => {
      setPendingShare(share || null);
    });

    // A visitor clicked "Download" on the share link. The link owner (this
    // device, if it queued the files) should send them. The handler is set via
    // `onShareDownloadRequest` below.
    socket.on("share-download-request", ({ fromId, fromName }) => {
      if (typeof onShareDownloadRequestRef.current === "function") {
        onShareDownloadRequestRef.current(fromId, fromName);
      }
    });

    socket.on("peer-joined", (peer) => {
      setPeers((prev) => [...prev.filter((p) => p.id !== peer.id), peer]);
    });

    socket.on("peer-updated", (peer) => {
      setPeers((prev) => prev.map((p) => (p.id === peer.id ? peer : p)));
    });

socket.on("peer-left", ({ id }) => {
      setPeers((prev) => prev.filter((p) => p.id !== id));
    });

    // Chat events — relayed exactly as the server forwards them.
    socket.on("chat-message", (msg) => {
      if (typeof onChatMessageRef.current === "function") onChatMessageRef.current(msg);
    });
    socket.on("chat-typing", (msg) => {
      if (typeof onChatTypingRef.current === "function") onChatTypingRef.current(msg);
    });

    return () => socket.disconnect();
  }, [netCode]);

  function updateProfile(patch) {
    socketRef.current?.emit("update-profile", patch);
    setSelf((s) => {
      const next = s ? { ...s, ...patch } : s;
      if (next) saveProfile({ name: next.name, avatar: next.avatar });
      return next;
    });
  }

// Switch how peers are discovered: "" (empty code) groups by local network/IP,
  // a code groups anyone with that code regardless of network. It updates the URL
  // in place (no page reload) and reconnects the socket into the right room.
  function setNetworkMode(code) {
    const clean = code.trim();
    const url = new URL(window.location.href);
    if (clean) url.searchParams.set("net", clean);
    else url.searchParams.delete("net");
    window.history.replaceState({}, "", url.toString());
    setNetCode(clean);
  }

  // Auto-rotate the "Anywhere" share code after 30 minutes so it can't be reused
  // forever. The new code is applied in place (no reload) via the same URL/state
  // update that setNetworkMode performs, which reconnects the socket into the new room.
  useEffect(() => {
    if (!netCode) return;
    const handle = setTimeout(() => {
      const fresh = Math.random().toString(36).slice(2, 7).toUpperCase();
      const url = new URL(window.location.href);
      url.searchParams.set("net", fresh);
      window.history.replaceState({}, "", url.toString());
      setNetCode(fresh);
    }, 30 * 60 * 1000);
    return () => clearTimeout(handle);
  }, [netCode]);

return {
    socket: socketRef.current,
    connected,
    self,
    roomId,
    peers,
    netCode,
    pendingShare,
    updateProfile,
    setNetworkMode,
    // Publish the queued files for the current share link, or clear them by
    // passing an empty array. Anyone who opens the link sees them.
    updateShare: (files) => {
      socketRef.current?.emit("share-files", { files: Array.isArray(files) ? files : [] });
    },
// Ask the server for the current share's queued files (used when the link
    // is opened directly, e.g. from a fresh tab with no prior state).
    requestShareFiles: () => {
      socketRef.current?.emit("request-share-files");
    },
    // Register a handler the link owner uses to send files when a visitor
    // clicks "Download" on the share modal. The handler receives the visitor's
    // id + name so it can call sendFilesToPeer.
    setOnShareDownloadRequest: (handler) => {
      onShareDownloadRequestRef.current = handler;
    },
// Tell the link owner to send the queued files to this device (the visitor).
    requestShareDownload: () => {
      socketRef.current?.emit("share-download-request");
    },

    // Chat API — send a message/typing ping to a specific peer, and register
    // callbacks for incoming chat events (invoked by the socket listeners above).
    sendChatMessage: (toId, text) => {
      socketRef.current?.emit("chat-message", { toId, text });
    },
    sendChatTyping: (toId) => {
      socketRef.current?.emit("chat-typing", { toId });
    },
    setOnChatMessage: (handler) => {
      onChatMessageRef.current = handler;
    },
    setOnChatTyping: (handler) => {
      onChatTypingRef.current = handler;
    },
  };
}
