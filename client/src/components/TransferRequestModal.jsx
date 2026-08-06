import { useEffect, useState } from "react";
import { formatBytes } from "../lib/fileTransfer.js";
import { iconForFile } from "../lib/fileIcons.js";
import Avatar from "./Avatar.jsx";
import "./TransferRequestModal.css";

const EXPIRY_SECONDS = 45;

export default function TransferRequestModal({ requests, onRespond }) {
  const request = requests[0] ?? null;
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);

  useEffect(() => {
    if (!request) return;
    setSecondsLeft(EXPIRY_SECONDS);
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [request?.requestId]);

  if (!request) return null;
  const totalSize = request.files.reduce((sum, f) => sum + f.size, 0);


  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--request" role="dialog" aria-modal="true">
        <p className="modal-card__eyebrow">Incoming Transfer</p>

<div className="request-peer">
          <span className="request-peer__avatar"><Avatar value={request.fromAvatar} alt={request.fromName} /></span>
          <span className="request-peer__name">{request.fromName}</span>
        </div>

        <p className="request-peer__subtitle">
          Wants to send you {request.files.length === 1 ? "a file" : `${request.files.length} files`}
        </p>

        <ul className="modal-card__files">
          {request.files.map((f, i) => (
            <li key={i}>
              <span className="modal-card__fileicon">{iconForFile(f.name)}</span>
              <span className="modal-card__filename">{f.name}</span>
              <span className="modal-card__filesize mono">{formatBytes(f.size)}</span>
            </li>
          ))}
        </ul>
        <p className="modal-card__total mono">
          <span>Total Size</span>
          <span>{formatBytes(totalSize)}</span>
        </p>

        <div className="modal-card__actions modal-card__actions--stacked">
          <button className="btn-primary btn-block" onClick={() => onRespond(request.requestId, request.fromId, true)}>
            Accept
          </button>
          <button className="btn-ghost btn-block" onClick={() => onRespond(request.requestId, request.fromId, false)}>
            Reject
          </button>
        </div>

        <p className="modal-card__expiry">This request will expire in {secondsLeft}s</p>
      </div>
    </div>
  );
}
