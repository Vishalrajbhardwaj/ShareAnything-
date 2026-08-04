import { useEffect, useState } from "react";
import { formatBytes } from "../lib/fileTransfer.js";
import { iconForFile } from "../lib/fileIcons.js";
import "./ShareDownloadModal.css";

export default function ShareDownloadModal({ share, onClose, onDownload, onRequest }) {
  const [connected, setConnected] = useState(false);

  // Let the parent know we're asking for the latest files (e.g. when the link
  // is opened directly in a fresh tab).
  useEffect(() => {
    onRequest?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (share && share.files?.length) setConnected(true);
  }, [share]);

  if (!share || !share.files?.length) return null;

  const totalBytes = share.files.reduce((sum, f) => sum + (f.size || 0), 0);

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
              </div>
            </div>
          ))}
        </div>

        <div className="sd-modal__actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary sd-modal__download"
            onClick={() => onDownload?.(share)}
            disabled={!connected}
          >
            {connected ? `Download all (${formatBytes(totalBytes)})` : "Connecting…"}
          </button>
        </div>
      </div>
    </div>
  );
}
