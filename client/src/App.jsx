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
import ProfileModal from "./components/ProfileModal.jsx";
import InviteView from "./components/InviteView.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import ShareDownloadModal from "./components/ShareDownloadModal.jsx";
import Toast from "./components/Toast.jsx";
import { getFavorites } from "./lib/favorites.js";
import { getHistory, addHistoryEntry } from "./lib/history.js";
import "./App.css";

export default function App() {
  const { socket, connected, self, peers: rawPeers, netCode, pendingShare, updateProfile, setNetworkMode, updateShare, requestShareFiles, setOnShareDownloadRequest, requestShareDownload } = useSocket();
  const { transfers, incomingRequests, sendFilesToPeer, respondToRequest, cancelTransfer, retryTransfer, removeTransfer, clearTransfers } = usePeerConnections(socket, self);

  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState("receive");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("profile");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState(() => getHistory());
  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [selectedPeerIds, setSelectedPeerIds] = useState([]);
  const [completeQueue, setCompleteQueue] = useState([]);
const [toastMsg, setToastMsg] = useState("");
  const [shareDownloadOpen, setShareDownloadOpen] = useState(false);
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

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-shell">
      <AppNav
        view={view}
        onChangeView={(next) => setView(next)}
        stats={activityStats}
        connectionLabel={connected ? "Connected" : "Connecting…"}
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
              <InviteView
                netCode={netCode}
                peers={peers}
                transfers={transfers}
                selectedPeerId={selectedPeerId}
                selectedPeers={selectedPeerIds}
                onSetNetworkMode={setNetworkMode}
                onSelectPeer={togglePeerSelection}
                onTogglePeer={togglePeerSelection}
                onSendFiles={sendFilesToPeer}
                onShareFiles={handleShareFiles}
                onNotify={setToastMsg}
                selectionMode
              />
            )}

            {view === "invite" && (
              <InviteView
                netCode={netCode}
                transfers={transfers}
                onSetNetworkMode={setNetworkMode}
                onShareFiles={updateShare}
                onNotify={setToastMsg}
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
          onDownload={() => setShareDownloadOpen(false)}
        />
      )}

      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}
