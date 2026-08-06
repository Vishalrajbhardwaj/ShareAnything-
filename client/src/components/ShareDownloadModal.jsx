import { useEffect, useRef, useState } from "react";
import { formatBytes } from "../lib/fileTransfer.js";
import { iconForFile } from "../lib/fileIcons.js";
import { downloadShareFile } from "../lib/cloudTransfer.js";
import "./ShareDownloadModal.css";

// A share's files can be served in two ways:
//   1. Server-hosted (the file has a `url`/`downloadUrl`) — download directly
//      from the server with progress shown here.
//   2. Legacy P2P (no URL) — delegate to the parent's `onDownload` which sends
//      the bytes over WebRTC.
function hasServerFiles(share) {
  return !!share?.files?.some((f) => f.url || f.downloadUrl);
}

export default function ShareDownloadModal({ share, onClose, onDownload, onRequest }) {
  const [connected, setConnected] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 overall
  const [fileProgress, setFileProgress] = useState({}); // filename -> 0..1
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  // Let the parent know we're asking for the latest files (e.g. when the link
  // is opened directly in a fresh tab).
  useEffect(() => {
    onRequest?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (share && share.files?.length) setConnected(true);
  }, [share]);

  // Clean up any in-flight download when the modal closes/unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (!share || !share.files?.length) return null;

  const totalBytes = share.files.reduce((sum, f) => sum + (f.size || 0), 0);
  const isServerShare = hasServerFiles(share);

  const handleDownload = async () => {
    if (downloading) return;

    // No server URLs -> fall back to the legacy P2P flow.
    if (!isServerShare) {
      onDownload?.(share);
      return;
    }

    setDownloading(true);
    setError("");
    setProgress(0);
    const perFile = {};
    const abort = new AbortController();
    abortRef.current = abort;

    const serverFiles = share.files.filter((f) => f.url || f.downloadUrl);
    let done = 0;
    try {
      for (const f of serverFiles) {
        const url = f.downloadUrl || f.url;
        perFile[f.name] = 0;
        setFileProgress({ ...perFile });
        await downloadShareFile(url, f.name, {
          signal: abort.signal,
          onProgress: (p) => {
            perFile[f.name] = p;
            setFileProgress({ ...perFile });
            const total = serverFiles.reduce((s, x) => s + (x.size || 0), 0);
            const current = serverFiles.reduce((s, x) => s + (perFile[x.name] || 0) * (x.size || 0), 0);
            setProgress(total ? current / total : 0);
          },
        });
        perFile[f.name] = 1;
        setFileProgress({ ...perFile });
        done += 1;
      }
      setProgress(1);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal__header">
          <div className="sd-modal__title">
            <span className="sd-modal__badge">📥</span>
            <div>
              <h2>Files ready to download</h2>
              <p className="sd-modal__sub">
                {share.senderName ? `From ${share.senderName}` : "Shared with you"} · {share.files.length} file
                {share.files.length > 1 ? "s" : ""} · {formatBytes(totalBytes)}
              </p>
            </div>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sd-modal__list">
          {share.files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="sd-file">
              <span className="sd-file__icon">{iconForFile(f.name)}</span>
              <div className="sd-file__body">
                <span className="sd-file__name">{f.name}</span>
                <span className="sd-file__size mono">{formatBytes(f.size)}</span>
                {downloading && typeof fileProgress[f.name] === "number" && (
                  <div className="sd-file__progress">
                    <div className="sd-file__progress-bar">
                      <div
                        className={`sd-file__progress-fill ${fileProgress[f.name] >= 1 ? "sd-file__progress-fill--done" : ""}`}
                        style={{ width: `${Math.round((fileProgress[f.name] || 0) * 100)}%` }}
                      />
                    </div>
                    <span className="sd-file__progress-ct mono">{Math.round((fileProgress[f.name] || 0) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="sd-modal__error">⚠ {error}</p>}

        <div className="sd-modal__actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {downloading ? "Cancel" : "Close"}
          </button>
          <button
            type="button"
            className="btn-primary sd-modal__download"
            onClick={handleDownload}
            disabled={!connected || downloading}
          >
            {downloading
              ? `Downloading ${Math.round(progress * 100)}%`
              : `Download all (${formatBytes(totalBytes)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
