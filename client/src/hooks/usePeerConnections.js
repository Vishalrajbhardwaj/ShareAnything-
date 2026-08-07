import { useCallback, useEffect, useRef, useState } from "react";
import { sendFiles, createReceiver, triggerDownload, formatSpeed, formatEta } from "../lib/fileTransfer.js";
import { uploadFile, downloadShareFile } from "../lib/cloudTransfer.js";
import { getPrefs } from "../lib/settings.js";
import { isFavorite } from "../lib/favorites.js";
import { playTheme } from "../lib/sounds.js";
import { notify } from "../lib/notifications.js";
import { isImageFileName } from "../components/ImagePreview.jsx";

// Fallback used only if /ice-servers can't be reached (offline dev, etc.) — covers the
// vast majority of home/office networks. The server can add a TURN entry via env vars
// for restrictive networks without any client changes; see fetchIceServers below.
const FALLBACK_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

let cachedIceServers = null;
async function fetchIceServers() {
  if (cachedIceServers) return cachedIceServers;
  try {
    const res = await fetch("/ice-servers");
    const data = await res.json();
    cachedIceServers = Array.isArray(data.iceServers) && data.iceServers.length ? data.iceServers : FALLBACK_ICE_SERVERS;
  } catch {
    cachedIceServers = FALLBACK_ICE_SERVERS;
  }
  return cachedIceServers;
}

// A request left unanswered on screen this long (matches the server-side timeout,
// with a little slack) is treated as timed out even if the server message is lost.
const CLIENT_REQUEST_TIMEOUT_MS = 50_000;
// How long a transfer may sit in "connecting" (ICE handshake) before we give up.
const CONNECT_TIMEOUT_MS = 20_000;

// Each transfer gets its own short-lived RTCPeerConnection, keyed by transferId.
// That keeps every send/receive handshake independent and easy to reason about,
// at the small cost of a fresh ICE negotiation per transfer.

function newTransferId() {
  return crypto.randomUUID();
}

export function usePeerConnections(socket, self) {
  const [transfers, setTransfers] = useState([]); // UI-facing summaries
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [receivedImages, setReceivedImages] = useState([]); // { id, name, blob, size } for preview

  const runtime = useRef(new Map()); // transferId -> { pc, channel, role, peerId, iceQueue, remoteSet, watchdog }
  const pendingFiles = useRef(new Map()); // transferId -> { peerId, peerName, files: File[] } — kept until done/cancelled so a failed send can be retried
  const speedTrackers = useRef(new Map()); // fileId -> { lastBytes, lastAt, bytesPerSecond }
  const notifiedRequestIds = useRef(new Set()); // avoid duplicate request notifications

  const patchTransfer = useCallback((id, patch) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const patchFile = useCallback((transferId, fileId, patch) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== transferId) return t;
        return { ...t, files: t.files.map((f) => (f.fileId === fileId ? { ...f, ...patch } : f)) };
      })
    );
  }, []);

  const sendSignal = useCallback(
    (toId, data) => socket?.emit("signal", { toId, data }),
    [socket]
  );

  function trackSpeed(fileId, bytesDone, now) {
    const prev = speedTrackers.current.get(fileId);
    if (!prev) {
      speedTrackers.current.set(fileId, { lastBytes: bytesDone, lastAt: now, bytesPerSecond: 0 });
      return 0;
    }
    const deltaBytes = bytesDone - prev.lastBytes;
    const deltaMs = now - prev.lastAt;
    const instantRate = deltaMs > 0 ? (deltaBytes / deltaMs) * 1000 : prev.bytesPerSecond;
    // Light smoothing so the displayed speed doesn't jump around every tick.
    const smoothed = prev.bytesPerSecond ? prev.bytesPerSecond * 0.7 + instantRate * 0.3 : instantRate;
    speedTrackers.current.set(fileId, { lastBytes: bytesDone, lastAt: now, bytesPerSecond: smoothed });
    return smoothed;
  }

  function clearWatchdog(entry) {
    if (entry?.watchdog) {
      clearTimeout(entry.watchdog);
      entry.watchdog = null;
    }
  }

  function cleanupTransfer(transferId) {
    const entry = runtime.current.get(transferId);
    clearWatchdog(entry);
    try {
      entry?.channel?.close();
    } catch {}
    try {
      entry?.pc?.close();
    } catch {}
    runtime.current.delete(transferId);
  }

  const failTransfer = useCallback(
    (transferId, message = "Connection lost") => {
      patchTransfer(transferId, { status: "error", errorMessage: message });
      cleanupTransfer(transferId);
    },
    [patchTransfer]
  );

  // ---------- Sender side ----------

  const startRequest = useCallback(
    (peerId, peerName, files, transferId) => {
      pendingFiles.current.set(transferId, { peerId, peerName, files });

      setTransfers((prev) => [
        {
          id: transferId,
          peerId,
          peerName,
          direction: "send",
          status: "awaiting-approval",
          files: files.map((f) => ({ fileId: f.name + f.size, name: f.name, size: f.size, sent: 0, done: false })),
        },
        ...prev.filter((t) => t.id !== transferId),
      ]);

      socket?.emit("transfer-request", {
        toId: peerId,
        requestId: transferId,
        files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      });

      const watchdog = setTimeout(() => {
        setTransfers((prev) =>
          prev.map((t) => (t.id === transferId && t.status === "awaiting-approval" ? { ...t, status: "timeout" } : t))
        );
      }, CLIENT_REQUEST_TIMEOUT_MS);
      runtime.current.set(transferId, { watchdog, role: "send-pending", peerId });
    },
    [socket]
  );

  const sendFilesToPeer = useCallback(
    (peerId, peerName, fileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      startRequest(peerId, peerName, files, newTransferId());
    },
    [startRequest]
  );

const cancelTransfer = useCallback(
    (transferId) => {
      const pending = pendingFiles.current.get(transferId);
      if (pending) {
        socket?.emit("transfer-cancel", { toId: pending.peerId, requestId: transferId });
      }
      pendingFiles.current.delete(transferId);
      cleanupTransfer(transferId);
      setTransfers((prev) => prev.filter((t) => t.id !== transferId));
    },
    [socket]
  );

  // Remove a single transfer card from the list (UI only — the transfer itself
  // is already done/failed, or the user explicitly wants it gone).
  const removeTransfer = useCallback(
    (transferId) => {
      pendingFiles.current.delete(transferId);
      const entry = runtime.current.get(transferId);
      clearWatchdog(entry);
      try {
        entry?.pc?.close();
      } catch {}
      runtime.current.delete(transferId);
      setTransfers((prev) => prev.filter((t) => t.id !== transferId));
    },
    []
  );

  // Remove every transfer card at once (UI only).
  const clearTransfers = useCallback(() => {
    for (const transferId of [...runtime.current.keys()]) {
      const entry = runtime.current.get(transferId);
      clearWatchdog(entry);
      try {
        entry?.pc?.close();
      } catch {}
    }
    runtime.current.clear();
    pendingFiles.current.clear();
    setTransfers([]);
  }, []);

const retryTransfer = useCallback(
    (transferId) => {
      const pending = pendingFiles.current.get(transferId);
      if (!pending) return;
      cleanupTransfer(transferId);
      // Keep the same card visible and reset it back to "awaiting-approval"
      // so the retry gives clear visual feedback instead of the card vanishing.
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: "awaiting-approval",
                errorMessage: undefined,
                files: pending.files.map((f) => ({
                  fileId: f.name + f.size,
                  name: f.name,
                  size: f.size,
                  sent: 0,
                  done: false,
                })),
              }
            : t
        )
      );
      // Re-arm the existing pending files and re-send the request. Reusing the
      // same id keeps the UI card stable and the server clears its timeout entry
      // once the first outcome arrives, so there is no conflict here.
startRequest(pending.peerId, pending.peerName, pending.files, transferId);
    },
    [startRequest]
  );

  // Cloud transfer fallback: when a direct WebRTC connection can't be
  // established (different networks, strict NAT, no TURN), upload the pending
  // files to the server and tell the receiver via a signal so they download
  // them directly from the server. This makes file sharing work reliably
  // across any two devices, even when peer-to-peer fails.
  const sendViaCloud = useCallback(
    async (transferId, peerId) => {
      const pending = pendingFiles.current.get(transferId);
      if (!pending || !pending.files?.length) return;
      const { peerName, files } = pending;

      // Upload each file to the server.
      const hosted = [];
      patchTransfer(transferId, { status: "transferring" });
      try {
        for (const file of files) {
          const res = await uploadFile(file);
          if (res && res.url) {
            hosted.push({ name: file.name, size: file.size, type: file.type, url: res.url, downloadUrl: res.downloadUrl || res.url });
          }
        }
      } catch (err) {
        patchTransfer(transferId, { status: "error", errorMessage: "Cloud fallback upload failed: " + (err?.message || "network error") });
        return;
      }

      if (!hosted.length) {
        patchTransfer(transferId, { status: "error", errorMessage: "Cloud fallback upload returned no files." });
        return;
      }

      // Tell the receiver the download URLs via a signal (server just relays it).
      sendSignal(peerId, { kind: "cloud-transfer", transferId, files: hosted, fromName: self?.name || "Peer" });

      // Mark the send as done — bytes went through the server.
      patchTransfer(transferId, { status: "done" });
      pendingFiles.current.delete(transferId);
      const prefs = getPrefs();
      if (prefs.sound) playTheme(prefs.soundTheme, "complete");
      if (prefs.notifications) {
        notify(`Sent via cloud`, { body: `${hosted.length} file${hosted.length === 1 ? "" : "s"} uploaded to ${peerName}.` });
      }
      setTimeout(() => cleanupTransfer(transferId), 2000);
    },
    [patchTransfer, sendSignal, self]
  );

  const beginSending = useCallback(
    async (transferId, peerId) => {
      const pending = pendingFiles.current.get(transferId);
      if (!pending) return;
      const { files } = pending;

      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      const entry = { pc, role: "send", peerId };
      runtime.current.set(transferId, entry);

      entry.watchdog = setTimeout(() => {
        if (entry.pc.connectionState !== "connected") {
          // Direct P2P failed — fall back to server-hosted cloud transfer so the
          // files still get through reliably on any network.
          sendViaCloud(transferId, peerId);
        }
      }, CONNECT_TIMEOUT_MS);

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(peerId, { kind: "ice", transferId, candidate: e.candidate });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") clearWatchdog(entry);
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          const t = transfersSnapshotHasTransfer(transferId);
          if (t) failTransfer(transferId, "Connection lost mid-transfer.");
        }
      };

      const channel = pc.createDataChannel("files");
      channel.binaryType = "arraybuffer";
      entry.channel = channel;

      channel.onopen = () => {
        clearWatchdog(entry);
        patchTransfer(transferId, { status: "transferring" });
        sendFiles(channel, files, {
          onProgress: (fileId, sent, size, now) => {
            const bytesPerSecond = trackSpeed(fileId, sent, now);
            patchFile(transferId, fileId, {
              sent,
              speedLabel: formatSpeed(bytesPerSecond),
              etaLabel: formatEta(size - sent, bytesPerSecond),
            });
          },
          onFileDone: (fileId) => {
            speedTrackers.current.delete(fileId);
            patchFile(transferId, fileId, { done: true, speedLabel: "", etaLabel: "" });
          },
          onAllDone: () => {
            patchTransfer(transferId, { status: "done" });
            pendingFiles.current.delete(transferId);
            setTimeout(() => cleanupTransfer(transferId), 2000);
          },
        }).catch(() => failTransfer(transferId, "The connection dropped before the transfer finished."));
      };
      channel.onerror = () => failTransfer(transferId, "The connection dropped before the transfer finished.");

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(peerId, { kind: "offer", transferId, sdp: offer });
    },
    [patchFile, patchTransfer, sendSignal, failTransfer]
  );

  // Small helper so the connectionstatechange handler (defined before `transfers`
  // updates land) can check current status without a stale closure.
  const transfersRef = useRef(transfers);
  useEffect(() => {
    transfersRef.current = transfers;
  }, [transfers]);
  function transfersSnapshotHasTransfer(transferId) {
    const t = transfersRef.current.find((x) => x.id === transferId);
    return t && t.status !== "done" && t.status !== "error" && t.status !== "declined";
  }

  // ---------- Receiver side ----------

  const respondToRequest = useCallback(
    (requestId, fromId, accepted) => {
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      socket?.emit("transfer-response", { toId: fromId, requestId, accepted });
      if (accepted) {
        patchTransfer(requestId, { status: "connecting" });
      } else {
        setTransfers((prev) => prev.filter((t) => t.id !== requestId));
      }
    },
    [socket, patchTransfer]
  );

  const prepareToReceive = useCallback(
    async (transferId, peerId, offer) => {
      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      const entry = { pc, role: "receive", peerId, iceQueue: [], remoteSet: false };
      runtime.current.set(transferId, entry);

      entry.watchdog = setTimeout(() => {
        if (entry.pc.connectionState !== "connected") {
          failTransfer(transferId, "Couldn't connect — the other device may be on a restrictive network.");
        }
      }, CONNECT_TIMEOUT_MS);

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(peerId, { kind: "ice", transferId, candidate: e.candidate });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") clearWatchdog(entry);
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          if (transfersSnapshotHasTransfer(transferId)) failTransfer(transferId, "Connection lost mid-transfer.");
        }
      };

      pc.ondatachannel = (event) => {
        const channel = event.channel;
        channel.binaryType = "arraybuffer";
        const handle = createReceiver({
          onFileStart: ({ fileId, name, size }) => {
            setTransfers((prev) =>
              prev.map((t) =>
                t.id === transferId
                  ? { ...t, status: "transferring", files: [...t.files, { fileId, name, size, received: 0, done: false }] }
                  : t
              )
            );
          },
          onProgress: (fileId, received, size, now) => {
            const bytesPerSecond = trackSpeed(fileId, received, now);
            patchFile(transferId, fileId, {
              received,
              speedLabel: formatSpeed(bytesPerSecond),
              etaLabel: formatEta(size - received, bytesPerSecond),
            });
          },
onFileComplete: ({ fileId, name, blob }) => {
            speedTrackers.current.delete(fileId);
            patchFile(transferId, fileId, { done: true, speedLabel: "", etaLabel: "" });
            triggerDownload(blob, name);
            // Offer an in-app preview for received images (before the download
            // lands, the blob is already in memory).
            if (isImageFileName(name)) {
              setReceivedImages((prev) => [...prev, { id: `${fileId}-${Date.now()}`, name, blob, size: blob.size }]);
            }
          },
          onAllDone: () => {
            patchTransfer(transferId, { status: "done" });
            const prefs = getPrefs();
            const t = transfersRef.current.find((x) => x.id === transferId);
if (prefs.sound) playTheme(prefs.soundTheme, "complete");
            if (prefs.notifications && t) {
              notify(`Transfer complete`, { body: `${t.peerName} — ${t.files.length} file${t.files.length === 1 ? "" : "s"} received.` });
            }
            setTimeout(() => cleanupTransfer(transferId), 2000);
          },
        });
        channel.onmessage = (e) => handle(e.data);
        channel.onerror = () => failTransfer(transferId, "The connection dropped before the transfer finished.");
      };

      await pc.setRemoteDescription(offer);
      entry.remoteSet = true;
      entry.iceQueue.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
      entry.iceQueue = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(peerId, { kind: "answer", transferId, sdp: answer });
    },
    [patchFile, patchTransfer, sendSignal, failTransfer]
  );

  // ---------- Socket wiring ----------

  useEffect(() => {
    if (!socket) return;

const onTransferRequest = ({ fromId, fromName, fromAvatar, requestId, files }) => {
      setIncomingRequests((prev) => [...prev, { requestId, fromId, fromName, fromAvatar, files }]);
      setTransfers((prev) => [
        {
          id: requestId,
          peerId: fromId,
          peerName: fromName,
          direction: "receive",
          status: "awaiting-approval",
          files: files.map((f) => ({ fileId: f.name + f.size, name: f.name, size: f.size, received: 0, done: false })),
        },
        ...prev,
      ]);

      // Sound + desktop notification for the incoming request (one per request).
      const prefs = getPrefs();
      if (!notifiedRequestIds.current.has(requestId)) {
        notifiedRequestIds.current.add(requestId);
if (prefs.sound) playTheme(prefs.soundTheme, "request");
        if (prefs.notifications) {
          notify(`${fromName} wants to send you ${files.length === 1 ? "a file" : `${files.length} files`}`, {
            body: files.map((f) => f.name).join(", ").slice(0, 80),
          });
        }
      }

      // Auto-accept from ⭐ favorite devices when enabled.
      if (prefs.autoAccept && isFavorite(fromName)) {
        respondToRequest(requestId, fromId, true);
      }
    };

    const onTransferCancel = ({ requestId }) => {
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      setTransfers((prev) => prev.filter((t) => t.id !== requestId));
    };

    const onTransferResponse = ({ requestId, accepted, fromId, timedOut }) => {
      if (accepted) {
        beginSending(requestId, fromId);
      } else if (timedOut) {
        patchTransfer(requestId, { status: "timeout" });
      } else {
        patchTransfer(requestId, { status: "declined" });
      }
    };

    // When the sender's direct P2P connection fails, they fall back to uploading
    // the files to the server and signal us with download URLs. We then fetch and
    // auto-download each file from the server.
    const handleCloudTransfer = async ({ transferId, files, fromName }) => {
      if (!Array.isArray(files) || files.length === 0) return;
      patchTransfer(transferId, { status: "transferring", peerName: fromName || "Peer" });
      for (const f of files) {
        try {
          await downloadShareFile(f.downloadUrl || f.url, f.name);
        } catch (err) {
          patchTransfer(transferId, { status: "error", errorMessage: "Cloud download failed: " + (err?.message || "network error") });
          return;
        }
      }
      patchTransfer(transferId, { status: "done" });
      const prefs = getPrefs();
      if (prefs.sound) playTheme(prefs.soundTheme, "complete");
      if (prefs.notifications) {
        notify(`Transfer complete`, { body: `${fromName || "Peer"} sent ${files.length} file${files.length === 1 ? "" : "s"} via cloud.` });
      }
    };

    const onSignal = ({ fromId, data }) => {
      const { kind, transferId } = data;
      if (kind === "offer") {
        prepareToReceive(transferId, fromId, data.sdp);
        return;
      }
      if (kind === "cloud-transfer") {
        handleCloudTransfer(data);
        return;
      }
      const entry = runtime.current.get(transferId);
      if (!entry) return;
      if (kind === "answer") {
        entry.pc.setRemoteDescription(data.sdp).catch(() => {});
      } else if (kind === "ice") {
        const candidate = new RTCIceCandidate(data.candidate);
        if (entry.remoteSet === false && entry.role === "receive") {
          entry.iceQueue.push(candidate);
        } else {
          entry.pc?.addIceCandidate(candidate).catch(() => {});
        }
      }
    };

    // If the peer on the other end of a pending or active transfer vanishes
    // (closed tab, dead Wi-Fi), fail fast instead of leaving the UI hanging.
    const onPeerLeft = ({ id }) => {
      setIncomingRequests((prev) => prev.filter((r) => r.fromId !== id));
      setTransfers((prev) =>
        prev.map((t) => {
          if (t.peerId !== id) return t;
          if (t.status === "done" || t.status === "error" || t.status === "declined" || t.status === "timeout") return t;
          cleanupTransfer(t.id);
          return { ...t, status: "error", errorMessage: "The other device disconnected." };
        })
      );
    };

    socket.on("transfer-request", onTransferRequest);
    socket.on("transfer-cancel", onTransferCancel);
    socket.on("transfer-response", onTransferResponse);
    socket.on("signal", onSignal);
    socket.on("peer-left", onPeerLeft);

return () => {
      socket.off("transfer-request", onTransferRequest);
      socket.off("transfer-cancel", onTransferCancel);
      socket.off("transfer-response", onTransferResponse);
      socket.off("signal", onSignal);
      socket.off("peer-left", onPeerLeft);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, beginSending, prepareToReceive, patchTransfer, respondToRequest]);

  // Warn before leaving the tab while a transfer is actively moving bytes.
  useEffect(() => {
    function onBeforeUnload(e) {
      const active = transfers.some((t) => t.status === "connecting" || t.status === "transferring");
      if (active) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [transfers]);

return {
    transfers,
    incomingRequests,
    receivedImages,
    dismissImage: (id) => setReceivedImages((prev) => prev.filter((img) => img.id !== id)),
    sendFilesToPeer,
    respondToRequest,
    cancelTransfer,
    retryTransfer,
    removeTransfer,
    clearTransfers,
  };
}
