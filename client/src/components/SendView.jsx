import { useEffect, useRef, useState } from "react";
import { iconForFile } from "../lib/fileIcons.js";
import { formatBytes, formatSpeed, formatEta } from "../lib/fileTransfer.js";
import Avatar from "./Avatar.jsx";
import "./SendView.css";

function createTextFile(fileName, text) {
  return new File([text], fileName, { type: "text/plain;charset=utf-8" });
}

function humanDuration(seconds) {
  if (!seconds || seconds < 1) return "less than a second";
  const s = Math.round(seconds);
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const minPart = `${m} minute${m === 1 ? "" : "s"}`;
  return r ? `${minPart} ${r} second${r === 1 ? "" : "s"}` : minPart;
}

export default function SendView({
  peers = [],
  transfers = [],
  onSendFiles,
  onCancel,
  onNotify,
}) {
  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [messageText, setMessageText] = useState("Hello from Share Anywhere");
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const selectedPeer = peers.find((p) => p.id === selectedPeerId) ?? null;

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
    onSendFiles?.(selectedPeer.id, selectedPeer.name, queuedFiles);
    setQueuedFiles([]);
  };

  const sendText = () => {
    if (!messageText.trim() || !selectedPeer) return;
    const file = createTextFile("message", messageText.trim());
    onSendFiles?.(selectedPeer.id, selectedPeer.name, [file]);
    setShowTextModal(false);
    setMessageText("Hello from Share Anywhere");
  };

  const handlePaste = () => {
    if (!selectedPeer) return;
    setShowTextModal(true);
    setMessageText("Paste your message here");
  };

// Active transfers for this device (sent files in progress).
  const activeSends = transfers.filter(
    (t) => t.direction === "send" && (t.status === "awaiting-approval" || t.status === "connecting" || t.status === "transferring")
  );

  // Track when each send started so we can show elapsed time in the completion summary.
  const startedAtRef = useRef({});
  useEffect(() => {
    for (const t of transfers) {
      if (t.direction === "send" && (t.status === "awaiting-approval" || t.status === "connecting" || t.status === "transferring")) {
        if (!startedAtRef.current[t.id]) startedAtRef.current[t.id] = Date.now();
      }
    }
  }, [transfers]);

  // Most recent completed send, to show the "Hooray!" summary.
  const [doneSummary, setDoneSummary] = useState(null);
  const lastDoneRef = useRef(null);
  useEffect(() => {
    const done = transfers.find((t) => t.direction === "send" && t.status === "done" && t.id !== lastDoneRef.current);
    if (done) {
      lastDoneRef.current = done.id;
      const totalBytes = done.files.reduce((sum, f) => sum + (f.size || 0), 0);
      const startedAt = startedAtRef.current[done.id];
      const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : null;
      delete startedAtRef.current[done.id];
      setDoneSummary({
        peerName: done.peerName,
        totalBytes,
        fileCount: done.files.length,
        elapsed,
      });
      const timer = setTimeout(() => setDoneSummary(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [transfers]);

  return (
    <div className="send-view">
      <div className="page-card send-view__card">
        <h2 className="send-view__title">Send Files</h2>

        {/* Action buttons */}
        <div className="send-actions">
          <button type="button" className="send-action" onClick={() => fileInputRef.current?.click()}>
            <span className="send-action__icon">📄</span>
            <span className="send-action__label">File</span>
          </button>
          <button type="button" className="send-action" onClick={() => folderInputRef.current?.click()}>
            <span className="send-action__icon">📁</span>
            <span className="send-action__label">Folder</span>
          </button>
          <button type="button" className="send-action" onClick={() => setShowTextModal(true)}>
            <span className="send-action__icon">📝</span>
            <span className="send-action__label">Text</span>
          </button>
          <button type="button" className="send-action" onClick={handlePaste}>
            <span className="send-action__icon">📋</span>
            <span className="send-action__label">Paste</span>
          </button>
        </div>

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
        <input
          ref={folderInputRef}
          type="file"
          multiple
          webkitdirectory="true"
          directory="true"
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Selected files list */}
        <div className="send-files-section">
          <div className="send-section-label">
            <span>Selected files</span>
            <span className="send-section-count">{queuedFiles.length}</span>
          </div>
          {queuedFiles.length === 0 ? (
            <div className="send-files-empty">No files selected yet — tap File, Folder, Text or Paste above.</div>
          ) : (
            <div className="send-file-list">
              {queuedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="send-file-row">
                  <span className="send-file-row__icon">{iconForFile(file.name)}</span>
                  <span className="send-file-row__name">{file.name}</span>
                  <span className="send-file-row__size mono">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="send-file-row__remove"
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

        {/* Device selection */}
        <div className="send-devices-section">
          <div className="send-section-label">
            <span>Select device</span>
            <span className="send-section-count">{peers.length}</span>
          </div>
          {peers.length === 0 ? (
            <div className="send-devices-empty">No nearby devices found. Ask them to open Share Anywhere.</div>
          ) : (
            <div className="send-device-list">
              {peers.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  className={`send-device ${selectedPeerId === peer.id ? "send-device--selected" : ""}`}
                  onClick={() => setSelectedPeerId(peer.id)}
                >
<span className="send-device__avatar"><Avatar value={peer.avatar} alt={peer.name} /></span>
                  <span className="send-device__name">{peer.name}</span>
                  <span className="send-device__check">✓</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send now */}
        <div className="send-footer">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setQueuedFiles([])}
            disabled={!queuedFiles.length}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn-primary send-footer__send"
            onClick={sendQueued}
            disabled={!queuedFiles.length || !selectedPeer}
          >
            Send now{selectedPeer ? ` → ${selectedPeer.name}` : ""}
          </button>
        </div>

        {/* Active transfers with per-file progress */}
        {activeSends.length > 0 && (
          <div className="send-progress-section">
            <div className="send-section-label">
              <span>Transferring</span>
              <span className="send-section-count">{activeSends.length}</span>
            </div>
            {activeSends.map((transfer) => {
              const filesTotal = transfer.files.reduce((sum, f) => sum + (f.size || 0), 0);
              const filesDone = transfer.files.reduce((sum, f) => sum + (f.done ? f.size || 0 : 0), 0);
              const overallPct = filesTotal ? Math.min(100, Math.round((filesDone / filesTotal) * 100)) : 0;
              return (
                <div key={transfer.id} className="send-progress-card">
                  <div className="send-progress-card__head">
                    <span className="send-progress-card__peer">→ {transfer.peerName}</span>
                    <span className="send-progress-card__status">
                      {transfer.status === "awaiting-approval"
                        ? "Waiting for approval…"
                        : transfer.status === "connecting"
                        ? "Connecting…"
                        : `${overallPct}%`}
                    </span>
                    {transfer.status !== "done" && (
                      <button
                        type="button"
                        className="send-progress-card__cancel"
                        onClick={() => onCancel?.(transfer.id)}
                        aria-label="Cancel transfer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {transfer.status === "transferring" && (
                    <div className="send-progress-card__bar">
                      <div className="send-progress-card__bar-fill" style={{ width: `${overallPct}%` }} />
                    </div>
                  )}

                  {transfer.files.map((f) => {
                    const value = f.size ? (f.done ? f.size : f.sent || 0) : 0;
                    const pct = f.size ? Math.min(100, Math.round((value / f.size) * 100)) : 0;
                    const meta = [formatBytes(f.size), f.speedLabel, f.etaLabel].filter(Boolean).join(" · ");
                    return (
                      <div key={f.fileId} className="send-file-progress">
                        <div className="send-file-progress__top">
                          <span className="send-file-progress__icon">{iconForFile(f.name)}</span>
                          <span className="send-file-progress__name">{f.name}</span>
                          <span className="send-file-progress__meta mono">{f.done ? "Done ✓" : meta || `${pct}%`}</span>
                        </div>
                        <div className="send-file-progress__bar">
                          <div className="send-file-progress__bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Completion summary */}
        {doneSummary && (
          <div className="send-done-card">
            <div className="send-done-card__badge">🎉</div>
            <div className="send-done-card__body">
<h3>🎉 Hooray! You sent it successfully</h3>
              <p>
                {doneSummary.fileCount} file{doneSummary.fileCount === 1 ? "" : "s"} ({formatBytes(doneSummary.totalBytes)}) sent to{" "}
                {doneSummary.peerName} {doneSummary.elapsed != null ? `in ${humanDuration(doneSummary.elapsed)}` : ""}.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Text modal */}
      {showTextModal && (
        <div className="modal-backdrop" onClick={() => setShowTextModal(false)}>
          <div className="modal-card modal-card--text" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className="modal-card__eyebrow">Send text message</p>
            <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={6} placeholder="Type your message here..." />
            <div className="modal-card__actions">
              <button type="button" className="btn-ghost" onClick={() => setShowTextModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={sendText} disabled={!messageText.trim() || !selectedPeer}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
