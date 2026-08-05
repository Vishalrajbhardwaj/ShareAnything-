import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "./hooks/useSocket.js";
import { usePeerConnections } from "./hooks/usePeerConnections.js";
import Splash from "./components/Splash.jsx";
import AppNav from "./components/AppNav.jsx";
import RadarView from "./components/RadarView.jsx";
import StatusDashboard from "./components/StatusDashboard.jsx";
import TransferRequestModal from "./components/TransferRequestModal.jsx";
import TransferCompleteModal from "./components/TransferCompleteModal.jsx";
import TransferList from "./components/TransferList.jsx";
import SendView from "./components/SendView.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import InviteView from "./components/InviteView.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import ShareDownloadModal from "./components/ShareDownloadModal.jsx";
import Toast from "./components/Toast.jsx";
import ChatView from "./components/ChatView.jsx";
import ImagePreview from "./components/ImagePreview.jsx";
import { getFavorites } from "./lib/favorites.js";
import { getHistory, addHistoryEntry } from "./lib/history.js";
import { addChatMessage } from "./lib/chat.js";
import { getPrefs } from "./lib/settings.js";
import { playTheme } from "./lib/sounds.js";
import { notify } from "./lib/notifications.js";
import "./App.css";

export default function App() {
const { socket, connected, self, peers: rawPeers, netCode, pendingShare, updateProfile, setNetworkMode, updateShare, requestShareFiles, setOnShareDownloadRequest, requestShareDownload, sendChatMessage, sendChatTyping, setOnChatMessage, setOnChatTyping } = useSocket();
  const { transfers, incomingRequests, receivedImages, dismissImage, sendFilesToPeer, respondToRequest, cancelTransfer, retryTransfer, removeTransfer, clearTransfers } = usePeerConnections(socket, self);

const [showSplash, setShowSplash] = useState(true);
  // If the app was opened via a share link (?net=CODE), start on the Invite
  // view so the user immediately sees the share code / QR instead of a blank
  // radar screen.
  const [view, setView] = useState(() =>
    new URLSearchParams(window.location.search).get("net") ? "invite" : "receive"
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("profile");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState(() => getHistory());
  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [selectedPeerIds, setSelectedPeerIds] = useState([]);
  const [completeQueue, setCompleteQueue] = useState([]);
const [toastMsg, setToastMsg] = useState("");
  const [shareDownloadOpen, setShareDownloadOpen] = useState(false);
  const [chatVersion, setChatVersion] = useState(0); // bumps when a chat message arrives → ChatView re-reads in real-time
  const [unreadChat, setUnreadChat] = useState(0); // total unread chat messages → badge on the Chat nav icon
  const activeChatPeerRef = useRef(null); // which peer the Chat view is currently showing
  const loggedTransferIds = useRef(new Set());
  const notifiedTransferIds = useRef(new Set());
  const queuedFilesRef = useRef([]);

// When a share link is opened from a fresh tab, the server sends the queued
  // files via `pendingShare`. Show the download modal automatically.
  useEffect(() => {
    if (pendingShare && pendingShare.files?.length) {
      setShareDownloadOpen(true);
    }
  }, [pendingShare]);

// If we opened a share link (?net=CODE) but haven't received the share data
  // yet (timing race), actively ask the server for it. Without this, the
  // download modal would never open and the visitor would see a blank screen.
  useEffect(() => {
    if (connected && netCode) {
      requestShareFiles();
    }
    // Only run when connection/code changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, netCode]);

  // Keep polling for the share files while we're a visitor on a share link but
  // haven't received them yet. The owner may publish the files slightly AFTER
  // this visitor connects, so a single request isn't always enough.
  useEffect(() => {
    if (!connected || !netCode || pendingShare?.files?.length) return;
    const id = setInterval(() => requestShareFiles(), 2000);
    return () => clearInterval(id);
  }, [connected, netCode, pendingShare, requestShareFiles]);

  // The link owner (this device) holds the queued files. When a visitor clicks
  // "Download", forward them via a normal peer transfer.
  useEffect(() => {
    setOnShareDownloadRequest((fromId, fromName) => {
      const files = queuedFilesRef.current;
      if (files.length && fromId) {
        sendFilesToPeer(fromId, fromName, files);
      }
    });
  }, [setOnShareDownloadRequest, sendFilesToPeer]);

  // Favorite devices float to the front of the list so they're easy to spot.
  const peers = useMemo(() => {
    const favs = new Set(getFavorites());
    return [...rawPeers].sort((a, b) => {
      const fa = favs.has(a.name) ? 0 : 1;
      const fb = favs.has(b.name) ? 0 : 1;
      return fa - fb;
    });
  }, [rawPeers]);

  // Log completed transfers to the persistent history panel, once each.
  useEffect(() => {
    for (const t of transfers) {
      if (t.status !== "done" || loggedTransferIds.current.has(t.id)) continue;
      loggedTransferIds.current.add(t.id);
      const direction = t.direction === "send" ? "sent" : "received";
      for (const f of t.files) {
        addHistoryEntry({ fileName: f.name, size: f.size, peerName: t.peerName, direction });
      }
      setHistoryEntries(getHistory());
    }
  }, [transfers]);

  // Show a one-time "Transfer Complete" celebration for each finished transfer
  // (both sent and received).
  useEffect(() => {
    for (const t of transfers) {
      if (t.status !== "done" || notifiedTransferIds.current.has(t.id)) continue;
      notifiedTransferIds.current.add(t.id);
      setCompleteQueue((q) => [...q, t]);
    }
  }, [transfers]);

  const completeTransfer = completeQueue[0] ?? null;
  function dismissComplete() {
    setCompleteQueue((q) => q.slice(1));
  }

  const selectedPeer = useMemo(() => peers.find((p) => p.id === selectedPeerId) ?? null, [peers, selectedPeerId]);

  const togglePeerSelection = (peer) => {
    setSelectedPeerIds((prev) => {
      const exists = prev.some((item) => item.id === peer.id);
      if (exists) return prev.filter((item) => item.id !== peer.id);
      return [...prev, peer];
    });
    setSelectedPeerId(peer.id);
  };

  const busyPeerIds = useMemo(() => {
    const ids = new Set();
    for (const t of transfers) {
      if (t.status === "connecting" || t.status === "transferring") ids.add(t.peerId);
    }
    return ids;
  }, [transfers]);

const activityStats = useMemo(() => {
    const sent = transfers.filter((t) => t.direction === "send").length;
    const received = transfers.filter((t) => t.direction === "receive").length;
    const active = transfers.filter((t) => t.status === "connecting" || t.status === "transferring").length;
    return { sent, received, active };
  }, [transfers]);

// Keep the queued files both for the share link (server) and locally so the
  // link owner can send them to a visitor who requests a download.
  const handleShareFiles = (files) => {
    queuedFilesRef.current = files || [];
    updateShare(files || []);
  };

  // When switching network mode (e.g. This Network -> Anywhere), the socket
  // reconnects to a new room. Re-publish the queued files once the new socket
  // is connected so anyone opening the fresh link sees them right away.
  useEffect(() => {
    if (connected && queuedFilesRef.current.length) {
      updateShare(queuedFilesRef.current);
    }
    // Only re-run when the connection state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Paste a file (e.g. copied in File Explorer/Finder) straight to whichever device is selected.
  useEffect(() => {
    function onPaste(e) {
      if (!selectedPeer) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        sendFilesToPeer(selectedPeer.id, selectedPeer.name, files);
      }
    }
window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [selectedPeer, sendFilesToPeer]);

// Incoming chat messages — persist them, bump the version so ChatView
  // re-reads in real-time, and track the unread badge count.
  useEffect(() => {
    setOnChatMessage((msg) => {
      if (!msg || !msg.fromName || !msg.text) return;
      addChatMessage(msg.fromName, { text: msg.text, from: "them" });
      // Bump the version so the open ChatView re-reads its messages immediately.
      setChatVersion((v) => v + 1);
      // Only count as unread if we're not already viewing that peer's chat.
      if (view !== "chat" || activeChatPeerRef.current !== msg.fromName) {
        setUnreadChat((n) => n + 1);
      }
const prefs = getPrefs();
      if (prefs.sound) playTheme(prefs.soundTheme, "request");
      if (prefs.notifications) {
        notify(`${msg.fromName}`, { body: msg.text.slice(0, 80) });
      }
      setToastMsg(`${msg.fromName}: ${msg.text}`);
    });
    setOnChatTyping(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOnChatMessage, setOnChatTyping, view]);

  // Global drag & drop — drop files anywhere to send to the selected device.
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  useEffect(() => {
    function onDragEnter(e) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    }
    function onDragOver(e) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
    }
    function onDragLeave(e) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragActive(false);
    }
    function onDrop(e) {
      e.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      if (!selectedPeer) {
        setToastMsg("Select a device on the radar first, then drop files.");
        return;
      }
      sendFilesToPeer(selectedPeer.id, selectedPeer.name, files);
      setToastMsg(`Sending ${files.length} file${files.length === 1 ? "" : "s"} to ${selectedPeer.name}…`);
    }
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [selectedPeer, sendFilesToPeer, setToastMsg]);

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-shell">
<AppNav
        view={view}
        onChangeView={(next) => {
          setView(next);
          if (next === "chat") setUnreadChat(0);
        }}
        stats={activityStats}
        connectionLabel={connected ? "Connected" : "Connecting…"}
        unreadChat={unreadChat}
      />

      <div className="app-workbench">
        <header className="app-topbar">
          <div className="app-topbar__spacer" />
          <div className="app-topbar__actions">
            <button
              type="button"
              className="app-topbar__icon-button"
              onClick={() => {
                setHistoryOpen(true);
                setView("transfers");
              }}
              aria-label="Open transfer history"
              title="History"
            >
              🕘
            </button>

            <button
              type="button"
              className={`app-topbar__profile ${profileOpen ? "app-topbar__profile--active" : ""}`}
              onClick={() => {
                setProfileTab("profile");
                setProfileOpen(true);
              }}
              aria-label="Open profile"
            >
              <span className="app-topbar__avatar">{self?.avatar ?? "👤"}</span>
              <span className="app-topbar__name">{self?.name ?? "Profile"}</span>
            </button>

            <button
              type="button"
              className="app-topbar__icon-button"
              onClick={() => {
                setProfileTab("settings");
                setProfileOpen(true);
              }}
              aria-label="Open settings"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </header>

        <div className="app-body">
          <main className="app-main">
            {(view === "receive" || view === "radar") && (
              <RadarView
                self={self}
                peers={peers}
                transfers={transfers}
                busyPeerIds={busyPeerIds}
                selectedPeerId={selectedPeerId}
                onSelectPeer={(peer) => setSelectedPeerId(peer.id)}
                onSendFiles={sendFilesToPeer}
                onRemoveTransfer={removeTransfer}
              />
            )}

            {view === "transfers" && (
              <TransferList
                transfers={transfers}
                onCancel={cancelTransfer}
                onRetry={retryTransfer}
                onRemove={removeTransfer}
                onClear={clearTransfers}
              />
            )}

{view === "send" && (
              <SendView
                peers={peers}
                transfers={transfers}
                onSendFiles={sendFilesToPeer}
                onCancel={cancelTransfer}
                onNotify={setToastMsg}
              />
            )}

{view === "invite" && (
              <InviteView
                netCode={netCode}
                transfers={transfers}
                onSetNetworkMode={setNetworkMode}
                onShareFiles={handleShareFiles}
                onNotify={setToastMsg}
                hasPendingShare={!!pendingShare?.files?.length}
                isLinkVisitor={!!new URLSearchParams(window.location.search).get("net")}
              />
            )}

{view === "chat" && (
              <ChatView
                peers={peers}
                self={self}
                onSendChatMessage={sendChatMessage}
                onSendChatTyping={sendChatTyping}
                onNotify={setToastMsg}
                chatVersion={chatVersion}
                onActivePeerChange={(name) => (activeChatPeerRef.current = name)}
              />
            )}

</main>
        </div>
      </div>

      <TransferRequestModal requests={incomingRequests} onRespond={respondToRequest} />

      <TransferCompleteModal
        transfer={completeTransfer}
        onClose={dismissComplete}
        onViewFiles={() => {
          setView("transfers");
          dismissComplete();
        }}
      />

{historyOpen && (
        <HistoryPanel
          entries={historyEntries}
          onClose={() => setHistoryOpen(false)}
          onClear={() => setHistoryEntries([])}
        />
      )}

{profileOpen && (
        <ProfileModal
          self={self}
          netCode={netCode}
          initialTab={profileTab}
          onClose={() => setProfileOpen(false)}
          onUpdateProfile={updateProfile}
          onSetNetworkMode={setNetworkMode}
        />
      )}

{shareDownloadOpen && pendingShare && (
        <ShareDownloadModal
          share={pendingShare}
          onClose={() => setShareDownloadOpen(false)}
          onRequest={requestShareFiles}
          onDownload={() => {
            // Tell the link owner to send the queued files to this device.
            // The files arrive as a normal peer transfer (approval modal then progress).
            requestShareDownload();
            setShareDownloadOpen(false);
          }}
        />
      )}

<Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Image preview for received images */}
      {receivedImages.length > 0 && (
        <ImagePreview
          blob={receivedImages[receivedImages.length - 1].blob}
          name={receivedImages[receivedImages.length - 1].name}
          size={receivedImages[receivedImages.length - 1].size}
          onClose={() => dismissImage(receivedImages[receivedImages.length - 1].id)}
        />
      )}

      {/* Drag & drop overlay */}
      {dragActive && (
        <div className="drag-overlay">
          <div className="drag-overlay__inner">
            <span className="drag-overlay__icon">📁</span>
            <p className="drag-overlay__title">
              {selectedPeer ? `Drop to send to ${selectedPeer.name}` : "Select a device first"}
            </p>
            <p className="drag-overlay__sub">Release to send files</p>
          </div>
        </div>
      )}
    </div>
  );
}
