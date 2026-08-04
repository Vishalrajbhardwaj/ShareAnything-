import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./InviteView.css";

function randomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createFileFromText(fileName, text) {
  return new File([text], fileName, { type: "text/plain;charset=utf-8" });
}

export default function InviteView({
  netCode,
  peers = [],
  transfers = [],
  selectedPeerId,
  selectedPeers = [],
  onSetNetworkMode,
  onSelectPeer,
  onTogglePeer,
  onSendFiles,
  selectionMode = false,
  onShareFiles,
  onNotify,
}) {
  const [joinDraft, setJoinDraft] = useState("");
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [messageText, setMessageText] = useState("Hello from Share Anywhere");
  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Report the queued files to the server so anyone who opens the link can
  // download them directly. Keeps the share link in sync with what's queued.
  useEffect(() => {
    onShareFiles?.(queuedFiles);
  }, [queuedFiles, onShareFiles]);

  const inviteUrl = (() => {
    const url = new URL(window.location.href);
    if (netCode) url.searchParams.set("net", netCode);
    return url.toString();
  })();

  const visiblePeers = peers.length > 0 ? peers : [{ id: "demo-device", name: "Nearby device", avatar: "◎" }];

  const activePeer = visiblePeers.find((peer) => peer.id === selectedPeerId) ?? visiblePeers[0] ?? null;
  const targetPeers = selectedPeers.length > 0 ? selectedPeers : activePeer ? [activePeer] : [];
  const anywhereMode = !!netCode || selectionMode;

  const sendFiles = (fileList) => {
    if (!fileList?.length) return;
    const nextFiles = Array.from(fileList).filter(Boolean);
    if (!nextFiles.length) return;
    setQueuedFiles((prev) => {
      const merged = [...prev, ...nextFiles];
      const unique = merged.filter((file, index, array) => index === array.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified));
      return unique;
    });
  };

  const sendQueuedFiles = () => {
    if (!queuedFiles.length || !targetPeers.length) return;
    targetPeers.forEach((peer) => onSendFiles?.(peer.id, peer.name, queuedFiles));
    setQueuedFiles([]);
  };

  const sendTextFile = async (label, text) => {
    if (!text || !targetPeers.length) return;
    const file = createFileFromText(`${label}.txt`, text);
    const list = [file];
    targetPeers.forEach((peer) => onSendFiles?.(peer.id, peer.name, list));
    setShowTextModal(false);
    setMessageText("Hello from Share Anywhere");
  };

const downloadQr = () => {
    const svg = qrRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `share-anywhere-${netCode || "network"}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // Fallback for browsers without a clipboard API.
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    onNotify?.("Link copied!");
  };

  const activeTransfers = transfers.filter(
    (transfer) => transfer.status === "awaiting-approval" || transfer.status === "connecting" || transfer.status === "transferring"
  );

  if (selectionMode) {
    return (
      <div className="invite-view invite-view--selection">
        <div className="page-card invite-view__card invite-view__card--selection">
          <div className="mode-toggle mode-toggle--compact">
            <button
              type="button"
              className={`mode-toggle__opt ${!netCode ? "mode-toggle__opt--active" : ""}`}
              onClick={() => onSetNetworkMode("")}
            >
              This Network
            </button>
            <button
              type="button"
              className={`mode-toggle__opt ${netCode ? "mode-toggle__opt--active" : ""}`}
              onClick={() => onSetNetworkMode(netCode || randomCode())}
            >
              Anywhere
            </button>
          </div>

          {!netCode && (
            <div className="share-inline-card">
              <div className="share-inline-card__header">
                <span>Share via QR / Link</span>
                <button type="button" className="btn-ghost btn-ghost--sm" onClick={() => onSetNetworkMode(randomCode())}>
                  Generate
                </button>
              </div>
              <p>Switch to Anywhere mode to create a share code or QR and send it to another device.</p>
            </div>
          )}

          {netCode && (
            <div className="share-inline-card">
              <div className="share-inline-card__header">
                <span>Share code: {netCode}</span>
<button type="button" className="btn-ghost btn-ghost--sm" onClick={copyLink}>
                  Copy Link
                </button>
              </div>
              <div className="share-inline-card__qr-wrap">
                <QRCodeSVG value={window.location.href} size={120} bgColor="#edf5f2" fgColor="#101a34" />
              </div>
            </div>
          )}

<div className="selection-title">
            <span className="selection-title__badge">{targetPeers.length}</span>
            <span>Selected devices</span>
          </div>

          {targetPeers.length === 0 ? (
            <div className="selection-empty-hint">
              <p>Select a device below to start sending files.</p>
            </div>
          ) : (
            <div className="selection-actions">
              <button type="button" className="selection-action" onClick={() => fileInputRef.current?.click()}>
                <span className="selection-action__icon">📄</span>
                <span className="selection-action__label">File</span>
              </button>
              <button type="button" className="selection-action" onClick={() => folderInputRef.current?.click()}>
                <span className="selection-action__icon">📁</span>
                <span className="selection-action__label">Folder</span>
              </button>
              <button type="button" className="selection-action" onClick={() => setShowTextModal(true)}>
                <span className="selection-action__icon">📝</span>
                <span className="selection-action__label">Text</span>
              </button>
              <button
                type="button"
                className="selection-action"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setMessageText(text);
                      setShowTextModal(true);
                    } else {
                      setMessageText("Paste your message here");
                      setShowTextModal(true);
                    }
                  } catch {
                    setMessageText("Paste your message here");
                    setShowTextModal(true);
                  }
                }}
              >
                <span className="selection-action__icon">📋</span>
                <span className="selection-action__label">Paste</span>
              </button>
            </div>
          )}

          {netCode && queuedFiles.length > 0 && (
            <div className="share-ready-card">
              <div className="share-ready-card__header">
                <span className="share-ready-card__title">🎉 Link ready — share it to send</span>
                <span className="share-ready-card__code">CODE: {netCode}</span>
              </div>
              <div className="share-ready-card__body">
                <div className="share-ready-card__qr">
                  <QRCodeSVG value={window.location.href} size={110} bgColor="#edf5f2" fgColor="#101a34" />
                </div>
                <div className="share-ready-card__text">
                  <p>Scan the QR or share the link. The other device connects automatically and you can send multiple times while connected — the code refreshes after 30 minutes.</p>
                  <button type="button" className="btn-ghost btn-ghost--sm" onClick={copyLink}>
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              sendFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            webkitdirectory="true"
            directory="true"
            hidden
            onChange={(e) => {
              sendFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {activeTransfers.length > 0 && (
            <div className="selection-summary__section">
              <span className="selection-summary__label">Live transfers</span>
              <div className="selection-transfer-list">
                {activeTransfers.map((transfer) => {
                  const total = transfer.files.reduce((sum, file) => sum + (file.size || 0), 0);
                  const value = transfer.direction === "send" ? transfer.files.reduce((sum, file) => sum + (file.sent || 0), 0) : transfer.files.reduce((sum, file) => sum + (file.received || 0), 0);
                  const percent = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
                  const label = transfer.status === "awaiting-approval" ? "Awaiting accept" : transfer.status === "transferring" ? "Transferring" : "Connecting…";

                  return (
                    <div key={transfer.id} className="selection-transfer-item">
                      <div className="selection-transfer-item__ring" style={{ background: `conic-gradient(var(--accent-signal) ${percent}%, rgba(255,255,255,0.08) ${percent}% 100%)` }}>
                        <span>{percent}%</span>
                      </div>
                      <div className="selection-transfer-item__body">
                        <strong>{transfer.peerName}</strong>
                        <span>{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="selection-summary">
            <div className="selection-summary__section">
              <span className="selection-summary__label">Selected users</span>
              <div className="selection-pill-list">
                {targetPeers.length === 0 && <span className="selection-pill selection-pill--empty">No user selected</span>}
                {targetPeers.map((peer) => (
                  <button key={peer.id} type="button" className="selection-pill" onClick={() => onTogglePeer?.(peer)}>
                    {peer.name} ×
                  </button>
                ))}
              </div>
            </div>

            <div className="selection-summary__section">
              <span className="selection-summary__label">Queued files</span>
              <div className="selection-file-list">
                {queuedFiles.length === 0 && <span className="selection-file-list__empty">No files queued yet</span>}
                {queuedFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="selection-file-item">
                    <span>{file.name}</span>
                    <button type="button" onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== index))}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="selection-actions__footer">
            <button type="button" className="btn-ghost" onClick={() => setQueuedFiles([])} disabled={!queuedFiles.length}>
              Clear files
            </button>
            <button type="button" className="btn-primary" onClick={sendQueuedFiles} disabled={!queuedFiles.length || !targetPeers.length}>
              Send now
            </button>
          </div>

<div className="nearby-header">
            <span className="nearby-header__title">Nearby devices</span>
            <span className="nearby-header__count">{visiblePeers.length}</span>
          </div>

          <div className="nearby-devices">
            {visiblePeers.map((peer) => (
              <button
                key={peer.id}
                type="button"
                className={`nearby-device ${targetPeers.some((item) => item.id === peer.id) ? "nearby-device--selected" : ""}`}
                onClick={() => onTogglePeer?.(peer)}
              >
                <span className="nearby-device__dot" aria-hidden="true" />
                <span className="nearby-device__avatar">{peer.avatar ?? "◇"}</span>
<span className="nearby-device__name">{peer.name}</span>
                <span className="nearby-device__check">✓</span>
              </button>
            ))}
          </div>

          <div className="troubleshoot">
            <h3>Troubleshoot</h3>
            <p>Please ensure that the desired target is also on the same Wi‑Fi network.</p>
          </div>

          {showTextModal && (
            <div className="modal-backdrop">
              <div className="modal-card modal-card--text" role="dialog" aria-modal="true">
                <p className="modal-card__eyebrow">Send text message</p>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  placeholder="Type your message here..."
                />
                <div className="modal-card__actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowTextModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!messageText.trim()) return;
                      sendTextFile("message", messageText.trim());
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="invite-view">
      <div className="page-card invite-view__card">
        <div className="mode-toggle">
          <button
            className={`mode-toggle__opt ${!netCode ? "mode-toggle__opt--active" : ""}`}
            onClick={() => onSetNetworkMode("")}
          >
            This Network
          </button>
          <button
            className={`mode-toggle__opt ${netCode ? "mode-toggle__opt--active" : ""}`}
            onClick={() => onSetNetworkMode(netCode || randomCode())}
          >
            Anywhere
          </button>
        </div>

        {!netCode ? (
          <div className="invite-view__content">
            <p className="invite-view__hint">
              You are visible only on this local network right now. Use the Anywhere mode to create a share link or QR code
              for a device outside this Wi‑Fi.
            </p>

            <div className="invite-view__cta-row">
              <button className="btn-solid" onClick={() => onSetNetworkMode(randomCode())}>Create Anywhere link</button>
            </div>
          </div>
        ) : (
          <div className="invite-view__content">
            <p className="invite-view__hint">Share this code or scan it from another device to connect.</p>

            <div className="invite-view__code-block">
              <span className="invite-view__code">{netCode}</span>
            </div>

            <div className="invite-view__qr-wrap">
              <div className="invite-view__qr">
                <QRCodeSVG ref={qrRef} value={inviteUrl} size={180} bgColor="#f5f7ff" fgColor="#101a34" />
              </div>
            </div>

<div className="invite-view__actions">
              <button className="btn-solid" onClick={copyLink}>
                Copy Link
              </button>
              <button className="btn-ghost" onClick={downloadQr}>
                Download QR
              </button>
              <button className="btn-ghost" onClick={() => onSetNetworkMode(randomCode())}>
                New Code
              </button>
            </div>

            <div className="join-row">
              <input
                className="mono"
                placeholder="Join another code…"
                value={joinDraft}
                onChange={(e) => setJoinDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinDraft.trim() && onSetNetworkMode(joinDraft.trim())}
                maxLength={16}
              />
              <button className="btn-ghost" disabled={!joinDraft.trim()} onClick={() => onSetNetworkMode(joinDraft.trim())}>
                Join
              </button>
            </div>
          </div>
        )}

        {peers.length > 0 && (
          <div className="send-peer-panel">
            <div className="send-peer-panel__header">
              <h3>Available devices</h3>
              <span>{peers.length}</span>
            </div>

            <div className="send-peer-list">
              {peers.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  className={`send-peer ${selectedPeerId === peer.id ? "send-peer--selected" : ""}`}
                  onClick={() => onSelectPeer?.(peer)}
                >
                  <span className="send-peer__avatar" style={{ background: `linear-gradient(135deg, ${peer.avatar ? "#9ae6ff" : "#d6d8ff"}, #ffb2d2)` }}>
                    {peer.avatar}
                  </span>
                  <span className="send-peer__meta">
                    <strong>{peer.name}</strong>
                    <small>{peer.id.slice(0, 6)}</small>
                  </span>
                  <span className="send-peer__action">Send</span>
                </button>
              ))}
            </div>

            {selectedPeerId && (
              <div className="send-files-box">
                <input
                  id="send-file-input"
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    const peer = peers.find((item) => item.id === selectedPeerId);
                    if (peer && e.target.files?.length) onSendFiles?.(peer.id, peer.name, e.target.files);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="send-file-input" className="btn-solid send-files-box__label">
                  Select files to send
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
