import { formatBytes } from "../lib/fileTransfer.js";
import { iconForFile } from "../lib/fileIcons.js";
import "./TransferCompleteModal.css";

export default function TransferCompleteModal({ transfer, onViewFiles, onClose }) {
  if (!transfer) return null;
  const count = transfer.files.length;

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--complete" role="dialog" aria-modal="true">
        <div className="complete-badge">
          <span className="complete-badge__ring complete-badge__ring--1" />
          <span className="complete-badge__ring complete-badge__ring--2" />
          <span className="complete-badge__check">✓</span>
        </div>

        <h2 className="complete-title">Transfer Complete!</h2>
        <p className="complete-subtitle">
          {count} {count === 1 ? "file" : "files"} received successfully
        </p>

        <ul className="complete-files">
          {transfer.files.map((f, i) => (
            <li key={i}>
              <span className="complete-files__icon">{iconForFile(f.name)}</span>
              <span className="complete-files__name">{f.name}</span>
              <span className="complete-files__size mono">{formatBytes(f.size)}</span>
              <span className="complete-files__check">✓</span>
            </li>
          ))}
        </ul>

        <div className="modal-card__actions modal-card__actions--stacked">
          <button className="btn-primary btn-block" onClick={onViewFiles}>
            View Files
          </button>
          <button className="btn-ghost btn-block" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
