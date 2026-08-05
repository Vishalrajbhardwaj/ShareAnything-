import { useEffect, useState } from "react";
import { formatBytes } from "../lib/fileTransfer.js";
import "./ImagePreview.css";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;

export function isImageFileName(name) {
  return IMAGE_EXT.test(name);
}

// Preview a received image blob before it's saved. The blob is produced by the
// receiver's file handler; we render it via an object URL.
export default function ImagePreview({ blob, name, size, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!url) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="image-preview" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="image-preview__head">
          <span className="image-preview__name">{name}</span>
          <span className="image-preview__size mono">{formatBytes(size ?? blob.size ?? 0)}</span>
          <button className="panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <img className="image-preview__img" src={url} alt={name} />
        <div className="image-preview__actions">
          <button className="btn-ghost btn-block" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
