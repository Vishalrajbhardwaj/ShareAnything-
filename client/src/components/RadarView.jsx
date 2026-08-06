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

function PeerNode({ peer, isBusy, isSelected, onFiles, onSelect }) {
  const [dragOver, setDragOver] = useState(false);
  const [fav, setFav] = useState(() => isFavorite(peer.name));
  const inputRef = useRef(null);
  const angle = hashAngle(peer.id);
  const radius = hashRadius(peer.id);
  const rad = (angle * Math.PI) / 180;
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);
  const delay = hashDelay(peer.id);

  // Per-peer character theme so EACH radar node animates distinctly.
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

export default function RadarView({ self, peers, transfers = [], busyPeerIds, selectedPeerId, onSendFiles, onSelectPeer, onRemoveTransfer }) {
  const activeTransfers = transfers.filter(
    (t) => t.status === "awaiting-approval" || t.status === "connecting" || t.status === "transferring"
  );

  const recentTransfers = transfers.filter(
    (t) => t.status === "done" || t.status === "declined" || t.status === "timeout" || t.status === "error"
  ).slice(0, 5);

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
  };

  return (
    <div className={`radar-layout ${themeClass}`} style={themeVars}>
<div className="radar">
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
            onSelect={onSelectPeer}
            onFiles={(files) => onSendFiles(peer.id, peer.name, files)}
          />
        ))}

        {peers.length === 0 && (
          <div className="radar__empty">
            <span className="radar__empty-ping" />
            <p>Searching for nearby devices…</p>
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
