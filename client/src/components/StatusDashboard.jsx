import "./StatusDashboard.css";
import { formatBytes } from "../lib/fileTransfer.js";

export default function StatusDashboard({ transfers }) {
  // Calculate stats from transfers
  const sentCount = transfers.filter((t) => t.direction === "send").length;
  const receivedCount = transfers.filter((t) => t.direction === "receive").length;
  const activeTransfers = transfers.filter(
    (t) => t.status === "connecting" || t.status === "transferring"
  ).length;

  // Calculate total bytes sent/received
  let totalSent = 0;
  let totalReceived = 0;
  for (const t of transfers) {
    for (const f of t.files) {
      if (t.direction === "send") {
        totalSent += f.sent || 0;
      } else {
        totalReceived += f.received || 0;
      }
    }
  }

  return (
    <div className="status-dashboard">
      {/* SENT CARD */}
      <div className={`status-card ${sentCount > 0 ? "status-card--active" : ""}`}>
        <div className="status-card__header">
          <span className="status-card__label">
            <span className="status-card__icon">📤</span> Sent
          </span>
          <span className="status-card__count">{sentCount}</span>
        </div>
        {totalSent > 0 && (
          <span className="status-card__sub">{formatBytes(totalSent)}</span>
        )}
        {sentCount === 0 && <span className="status-card__sub">No files sent</span>}
        <div className="status-card__bar">
          <div
            className="status-card__bar-fill"
            style={{ width: `${sentCount > 0 ? Math.min(100, sentCount * 33) : 0}%` }}
          />
        </div>
      </div>

      {/* RECEIVED CARD */}
      <div className={`status-card ${receivedCount > 0 ? "status-card--active" : ""}`}>
        <div className="status-card__header">
          <span className="status-card__label">
            <span className="status-card__icon">📥</span> Received
          </span>
          <span className="status-card__count">{receivedCount}</span>
        </div>
        {totalReceived > 0 && (
          <span className="status-card__sub">{formatBytes(totalReceived)}</span>
        )}
        {receivedCount === 0 && <span className="status-card__sub">No files received</span>}
        <div className="status-card__bar">
          <div
            className="status-card__bar-fill"
            style={{ width: `${receivedCount > 0 ? Math.min(100, receivedCount * 33) : 0}%` }}
          />
        </div>
      </div>

      {/* ACTIVE SESSIONS CARD */}
      <div className={`status-card ${activeTransfers > 0 ? "status-card--active" : ""}`}>
        <div className="status-card__header">
          <span className="status-card__label">
            <span className="status-card__icon">🔄</span> Sessions
          </span>
          <span className="status-card__count">{activeTransfers}</span>
        </div>
        <span className="status-card__sub">
          {activeTransfers > 0
            ? `${activeTransfers} active transfer${activeTransfers > 1 ? "s" : ""}`
            : "No active transfers"}
        </span>
        <div className="status-card__bar">
          <div
            className="status-card__bar-fill"
            style={{ width: `${activeTransfers > 0 ? Math.min(100, activeTransfers * 50) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
