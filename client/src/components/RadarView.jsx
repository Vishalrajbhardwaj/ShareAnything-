import { useEffect, useRef, useState } from "react";
import { isFavorite, toggleFavorite } from "../lib/favorites.js";
import { avatarColor, characterTheme } from "../lib/avatars.js";
import { formatBytes } from "../lib/fileTransfer.js";
import { iconForFile } from "../lib/fileIcons.js";
import Avatar from "./Avatar.jsx";
import "./RadarView.css";

function CircularProgress({ percent, size = 56 }) {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <div className="live-transfer__ring-wrap" style={{ width: size, height: size }}>
      <svg className="live-transfer__ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} className="live-transfer__ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="live-transfer__ring-fill"
          style={{ strokeDasharray: circumference, strokeDashoffset: dash }}
        />
      </svg>
      <span className="live-transfer__ring-pct">{Math.round(percent)}%</span>
    </div>
  );
}

function TransferStatusCard({ transfer }) {
  const totalFiles = transfer.files.length || 1;
  const current = transfer.files.reduce((sum, file) => {
    const value = transfer.direction === "send" ? file.sent || 0 : file.received || 0;
    const size = file.size || 0;
    return sum + (size ? Math.min(1, value / size) : 0);
  }, 0);

  const percent = transfer.status === "done" ? 100 : transfer.status === "awaiting-approval" ? 0 : Math.min(100, Math.round((current / totalFiles) * 100));
  const value = transfer.status === "awaiting-approval" ? "Waiting" : transfer.status === "done" ? "Done" : `${percent}%`;

  const label = {
    "awaiting-approval": "Awaiting Accept",
    "connecting": "Connecting…",
    "transferring": "Transferring",
    "done": "Completed",
    "declined": "Declined",
    "timeout": "Timed Out"
  }[transfer.status] || "Failed";

  const fileSummary = transfer.files[0]?.name ?? "file";
  const totalBytes = transfer.files.reduce((sum, file) => sum + (file.size || 0), 0);

  return (
    <div className="live-transfer-card">
      <div className="live-transfer-card__left">
        <CircularProgress percent={percent} size={54} />
      </div>

      <div className="live-transfer-card__body">
        <div className="live-transfer-card__title-row">
          <span className="live-transfer-card__peer">{transfer.peerName}</span>
          <span className={`live-transfer-card__value status--${transfer.status}`}>{value}</span>
        </div>
        <p className="live-transfer-card__file" title={fileSummary}>{fileSummary}</p>
        <div className="live-transfer-card__meta">
          <span>{label}</span>
          <span className="mono">{formatBytes(totalBytes)}</span>
        </div>
      </div>
    </div>
  );
}

function hashAngle(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

function hashRadius(id) {
  let h = 0;
  for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return 30 + (h % 14);
}

function hashDelay(id) {
  let h = 0;
  for (const c of id) h = (h * 13 + c.charCodeAt(0)) >>> 0;
  return (h % 20) / 10;
}

function PeerNode({ peer, isBusy, isSelected, onFiles, onSelect, viaLink }) {
  const [dragOver, setDragOver] = useState(false);
  const [fav, setFav] = useState(() => isFavorite(peer.name));
  const inputRef = useRef(null);
  const angle = hashAngle(peer.id);
  const radius = hashRadius(peer.id);
  const rad = (angle * Math.PI) / 180;
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);
  const delay = hashDelay(peer.id);

  const distanceLabel = viaLink ? "Via link" : "Nearby";

  const peerTheme = characterTheme(peer.name);
  const peerThemeClass = `peer-char peer-char--${peerTheme.label}`;
  const themeVars = {
    "--peer-color": avatarColor(peer.avatar),
    "--tc1": peerTheme.c1,
    "--tc2": peerTheme.c2,
  };

  return (
    <div
      className={`peer-node-wrapper ${peerThemeClass} ${dragOver ? "peer-node--drag" : ""} ${
        isBusy ? "peer-node--busy" : ""
      } ${isSelected ? "peer-node--selected" : ""} ${fav ? "peer-node--favorite" : ""}`}
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s`, ...themeVars }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
    >
      <button
        type="button"
        className="peer-node__button"
        onClick={() => {
          onSelect(peer);
          inputRef.current?.click();
        }}
        title={`Click or drop files to send to ${peer.name}`}
      >
        <span className="peer-node__glyph" style={{ "--peer-color": avatarColor(peer.avatar) }}>
          <Avatar value={peer.avatar} alt={peer.name} />
        </span>
        <span className="peer-node__label">{peer.name}</span>
        <span className="peer-node__distance">{distanceLabel}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        className={`peer-node__star ${fav ? "peer-node__star--active" : ""}`}
        title={fav ? "Remove from favorites" : "Add to favorites"}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(peer.name);
          setFav((v) => !v);
        }}
      >
        {fav ? "★" : "☆"}
      </button>
    </div>
  );
}

const RESULT_META = {
  done: { icon: "✓", label: "Complete", color: "var(--success)" },
  declined: { icon: "✕", label: "Declined", color: "var(--danger)" },
  timeout: { icon: "⏱", label: "Timed out", color: "var(--text-muted)" },
  error: { icon: "⚠️", label: "Failed", color: "var(--danger)" },
};

function RecentTransferRow({ transfer, onRemove }) {
  const meta = RESULT_META[transfer.status] ?? { icon: "•", label: transfer.status, color: "var(--text-muted)" };
  const name = transfer.files[0]?.name ?? "file";
  return (
    <div className="recent-transfer-row">
      <span className="recent-transfer-row__icon">{iconForFile(name)}</span>
      <div className="recent-transfer-row__body">
        <span className="recent-transfer-row__name">{name}</span>
        <span className="recent-transfer-row__peer">
          {transfer.direction === "send" ? "→" : "←"} {transfer.peerName}
        </span>
      </div>
      <span className="recent-transfer-row__result" style={{ color: meta.color }} title={meta.label}>
        {meta.icon}
      </span>
      <button
        type="button"
        className="recent-transfer-row__close"
        onClick={() => onRemove?.(transfer.id)}
        aria-label="Remove transfer"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

export default function RadarView({ self, peers, transfers = [], busyPeerIds, selectedPeerId, netCode, onSendFiles, onSelectPeer, onRemoveTransfer, onOpenInvite }) {
  const radarRef = useRef(null);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [captured, setCaptured] = useState(false);
  const fileInputRef = useRef(null);

  const activeTransfers = transfers.filter(
    (t) => t.status === "awaiting-approval" || t.status === "connecting" || t.status === "transferring"
  );

  const recentTransfers = transfers.filter(
    (t) => t.status === "done" || t.status === "declined" || t.status === "timeout" || t.status === "error"
  ).slice(0, 5);

  // Transfers connected to the currently selected peer (for the flight line).
  const selectedTransfers = transfers.filter((t) => t.peerId === selectedPeerId);
  const selectedIsActive = selectedTransfers.some(
    (t) => t.status === "connecting" || t.status === "transferring"
  );

  const [burstKey, setBurstKey] = useState(0);
  const doneIds = useRef(new Set());

  useEffect(() => {
    for (const t of transfers) {
      if (t.status !== "done" || doneIds.current.has(t.id)) continue;
      doneIds.current.add(t.id);
      setBurstKey((k) => k + 1);
    }
  }, [transfers]);

  const theme = characterTheme(self?.name);
  const themeClass = `theme-${theme.label}`;
  const themeVars = {
    "--tc1": theme.c1,
    "--tc2": theme.c2,
  };

  const effectFlags = {
    lightning: theme.lightning,
    magic: theme.magic,
    stars: theme.stars,
    bubbles: theme.bubbles,
    leaves: theme.leaves,
    flame: theme.flame,
    aura: theme.aura,
    glitch: theme.glitch,
    shake: theme.shake,
    mask: theme.mask,
    waves: theme.waves,
    spark: theme.spark,
    speed: theme.speed,
    slash: theme.slash,
    chakra: theme.chakra,
    rubber: theme.rubber,
    smash: theme.smash,
    bat: theme.bat,
    shrink: theme.shrink,
    glow: theme.glow,
    mystic: theme.mystic,
    talking: theme.talking,
    web: theme.web,
    gear: theme.gear,
  };

  // Compute the selected peer's node position (percentage) so we can draw a
  // connection line from the center (self) to that peer.
  const selectedPeer = peers.find((p) => p.id === selectedPeerId) ?? null;
  let connLine = null;
  if (selectedPeer) {
    const angle = hashAngle(selectedPeer.id);
    const radius = hashRadius(selectedPeer.id);
    const rad = (angle * Math.PI) / 180;
    const x = 50 + radius * Math.cos(rad);
    const y = 50 + radius * Math.sin(rad);
    connLine = { x1: 50, y1: 50, x2: x, y2: y };
  }

  const addFiles = (fileList) => {
    if (!fileList?.length) return;
    const next = Array.from(fileList).filter(Boolean);
    if (!next.length) return;
    setQueuedFiles((prev) => {
      const merged = [...prev, ...next];
      return merged.filter(
        (file, index, array) =>
          index === array.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)
      );
    });
  };

  const sendQueued = () => {
    if (!queuedFiles.length || !selectedPeer) return;
    onSendFiles(selectedPeer.id, selectedPeer.name, queuedFiles);
    setQueuedFiles([]);
  };

  const captureRadar = async () => {
    const node = radarRef.current;
    if (!node) return;
    try {
      // Use html2canvas-free approach: draw the radar onto a canvas via SVG foreignObject.
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", node.offsetWidth);
      svg.setAttribute("height", node.offsetHeight);
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      foreign.setAttribute("width", "100%");
      foreign.setAttribute("height", "100%");
      const clone = node.cloneNode(true);
      // Strip external stylesheet-dependent classes we can't inline; keep layout.
      const fragment = document.createElement("div");
      fragment.appendChild(clone);
      foreign.appendChild(clone);
      svg.appendChild(foreign);
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `radar-${self?.name || "me"}.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCaptured(true);
      setTimeout(() => setCaptured(false), 2000);
    } catch (err) {
      console.error("Radar capture failed", err);
    }
  };

  return (
    <div className={`radar-layout ${themeClass}`} style={themeVars}>
      <div className="radar-region">
        <div className="radar" ref={radarRef}>
          <div className={`radar-master radar-master--${theme.label}`} aria-hidden="true" />
          {Object.entries(effectFlags).filter(([, v]) => v).map(([name]) => (
            <div key={name} className={`char-effect char-effect--${name}`} aria-hidden="true" />
          ))}
          <div className="radar__rings" aria-hidden="true">
            <span className="radar__ring radar__ring--1" />
            <span className="radar__ring radar__ring--2" />
            <span className="radar__ring radar__ring--3" />
            <span className="radar__sweep" />
          </div>

          {burstKey > 0 && (
            <div className="radar-burst" key={burstKey} aria-hidden="true">
              <span className="radar-burst__ring radar-burst__ring--1" />
              <span className="radar-burst__ring radar-burst__ring--2" />
              <span className="radar-burst__ring radar-burst__ring--3" />
            </div>
          )}

          {/* Connection line + flying file particles to the selected peer */}
          {connLine && (
            <svg className="radar__conn" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line
                x1={connLine.x1} y1={connLine.y1} x2={connLine.x2} y2={connLine.y2}
                className={`radar__conn-line ${selectedIsActive ? "radar__conn-line--active" : ""}`}
              />
              {selectedIsActive && (
                <g>
                  <circle className="radar__flight radar__flight--1" cx={connLine.x1} cy={connLine.y1} r="1.6" />
                  <circle className="radar__flight radar__flight--2" cx={connLine.x1} cy={connLine.y1} r="1.6" />
                  <circle className="radar__flight radar__flight--3" cx={connLine.x1} cy={connLine.y1} r="1.6" />
                  <circle className="radar__flight radar__flight--4" cx={connLine.x1} cy={connLine.y1} r="1.6" />
                </g>
              )}
            </svg>
          )}

          <div className="radar__self">
            <span className="radar__self-pulse" aria-hidden="true" />
            <span className="radar__self-glyph" style={{ "--peer-color": theme.c1 }}>
              <Avatar value={self?.avatar} alt={self?.name} />
            </span>
            <span className="radar__self-label">{self?.name ?? "You"}</span>
          </div>

          {peers.map((peer) => (
            <PeerNode
              key={peer.id}
              peer={peer}
              isBusy={busyPeerIds.has(peer.id)}
              isSelected={selectedPeerId === peer.id}
              viaLink={!!netCode}
              onSelect={onSelectPeer}
              onFiles={(files) => onSendFiles(peer.id, peer.name, files)}
            />
          ))}

          {peers.length === 0 && (
            <div className="radar__empty">
              <span className="radar__empty-ping" />
              <p>
                {netCode
                  ? "No one on this code yet — share your link so they can join."
                  : "No devices on this network yet."}
              </p>
              {onOpenInvite && (
                <button type="button" className="radar__empty-cta" onClick={onOpenInvite}>
                  🔗 {netCode ? "Share my link" : "Invite a device"}
                </button>
              )}
              <span className="radar__empty-sub">
                {netCode
                  ? "Codes refresh every 30 minutes."
                  : "For another laptop anywhere, use “Anywhere” to share via a link."}
              </span>
            </div>
          )}

          {/* Capture radar button */}
          <button type="button" className="radar__capture" onClick={captureRadar} title="Capture radar">
            {captured ? "✓ Saved" : "📸"}
          </button>
        </div>

        {/* File selection panel shown below the radar when a peer is selected */}
        {selectedPeer && (
          <div className="radar-filepanel">
            <div className="radar-filepanel__head">
              <span className="radar-filepanel__title">Send to {selectedPeer.name}</span>
              <span className="radar-filepanel__count">{queuedFiles.length}</span>
            </div>

            <div className="radar-filepanel__actions">
              <button type="button" className="radar-filepanel__btn" onClick={() => fileInputRef.current?.click()}>
                📄 File
              </button>
              <button type="button" className="radar-filepanel__btn" onClick={sendQueued} disabled={!queuedFiles.length}>
                📤 Send now
              </button>
              <button type="button" className="radar-filepanel__btn" onClick={() => setQueuedFiles([])} disabled={!queuedFiles.length}>
                ✕ Clear
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {queuedFiles.length > 0 && (
              <div className="radar-filepanel__list">
                {queuedFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="radar-filepanel__file">
                    <span className="radar-filepanel__file-ic">{iconForFile(file.name)}</span>
                    <span className="radar-filepanel__file-name">{file.name}</span>
                    <span className="radar-filepanel__file-size mono">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      className="radar-filepanel__file-rm"
                      onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={`Remove ${file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {(activeTransfers.length > 0 || recentTransfers.length > 0) && (
        <aside className="radar-status-panel">
          {activeTransfers.length > 0 && (
            <div className="radar-status-section">
              <p className="radar-status-panel__title">Active Transfers</p>
              <div className="radar-status-panel__list">
                {activeTransfers.map((transfer) => (
                  <TransferStatusCard key={transfer.id} transfer={transfer} />
                ))}
              </div>
            </div>
          )}

          {recentTransfers.length > 0 && (
            <div className="radar-status-section">
              <p className="radar-status-panel__title">Recent Activity</p>
              <div className="radar-status-panel__list radar-status-panel__list--recent">
                {recentTransfers.map((transfer) => (
                  <RecentTransferRow key={transfer.id} transfer={transfer} onRemove={onRemoveTransfer} />
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
