import { useMemo, useState } from "react";
import { formatBytes } from "../lib/fileTransfer.js";
import { iconForFile } from "../lib/fileIcons.js";
import "./TransferList.css";

const STATUS_LABEL = {
  "awaiting-approval": "Waiting for approval",
  connecting: "Connecting…",
  transferring: "Transferring",
  done: "Complete",
  declined: "Declined",
  timeout: "No response — timed out",
  error: "Failed",
};

const STATUS_ICON = {
  "awaiting-approval": "⏳",
  connecting: "🔗",
  transferring: "📡",
  done: "✅",
  declined: "❌",
  timeout: "⏱️",
  error: "⚠️",
};

const TABS = [
  { id: "all", label: "All" },
  { id: "send", label: "Sending" },
  { id: "receive", label: "Receiving" },
  { id: "done", label: "Done" },
];

function FileRow({ file, direction }) {
  const done = file.done;
  const value = direction === "send" ? file.sent : file.received;
  const pct = file.size ? Math.min(100, Math.round((value / file.size) * 100)) : 0;
  const metaBits = [formatBytes(file.size)];
  if (!done && file.speedLabel) metaBits.push(file.speedLabel);
  if (!done && file.etaLabel) metaBits.push(file.etaLabel);

  return (
    <div className="file-row">
      <div className="file-row__top">
        <span className="file-row__icon">{iconForFile(file.name)}</span>
        <span className="file-row__name">{file.name}</span>
        <span className="file-row__size mono">{metaBits.join(" · ")}</span>
      </div>
      <div className="file-row__bar">
        <div className="file-row__bar-fill" style={{ width: `${done ? 100 : pct}%` }} />
      </div>
    </div>
  );
}

export default function TransferList({ transfers, onCancel, onRetry, onRemove, onClear }) {
  const [tab, setTab] = useState("all");
  const [retryingId, setRetryingId] = useState(null);

  const filtered = useMemo(() => {
    if (tab === "all") return transfers;
    if (tab === "done") return transfers.filter((t) => t.status === "done");
    return transfers.filter((t) => t.direction === tab);
  }, [transfers, tab]);

  return (
    <div className="transfer-list">
      <div className="transfer-list__heading-row">
        <p className="transfer-list__heading">Transfers</p>
        {transfers.length > 0 && (
          <button type="button" className="transfer-list__clear-all" onClick={() => onClear?.()}>
            Clear all
          </button>
        )}
      </div>

      <div className="transfer-list__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`transfer-tab ${tab === t.id ? "transfer-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="transfer-list__empty">
          <span className="transfer-list__empty-icon">📭</span>
          <p>No transfers here yet.</p>
        </div>
      )}

      {filtered.map((t) => {
        const canCancel =
          t.direction === "send" &&
          (t.status === "awaiting-approval" || t.status === "connecting" || t.status === "transferring");
        const canRetry = t.direction === "send" && (t.status === "error" || t.status === "timeout" || t.status === "declined");
        return (
          <div key={t.id} className={`transfer-card transfer-card--${t.status}`}>
            <div className="transfer-card__top">
              <span className="transfer-card__peer">
                {t.direction === "send" ? "To" : "From"} {t.peerName}
              </span>
              <span className="transfer-card__status">
                <span className="transfer-card__status-icon">{STATUS_ICON[t.status] ?? ""}</span>
                {STATUS_LABEL[t.status] ?? t.status}
                <button
                  type="button"
                  className="transfer-card__close"
                  onClick={() => onRemove?.(t.id)}
                  aria-label="Remove transfer"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            </div>

            {t.status === "error" && t.errorMessage && <p className="transfer-card__error">{t.errorMessage}</p>}

            {t.files.map((f) => (
              <FileRow key={f.fileId} file={f} direction={t.direction} />
            ))}

            {(canCancel || canRetry) && (
              <div className="transfer-card__actions">
                {canCancel && (
                  <button className="btn-ghost btn-ghost--sm transfer-card__cancel" onClick={() => onCancel?.(t.id)}>
                    ✕ Cancel
                  </button>
                )}
                {canRetry && (
                  <button
                    className="transfer-card__retry"
                    onClick={() => {
                      setRetryingId(t.id);
                      onRetry?.(t.id);
                    }}
                    disabled={retryingId === t.id}
                  >
                    ⟳ {retryingId === t.id ? "Retrying…" : "Retry"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

