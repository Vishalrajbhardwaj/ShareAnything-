import { useMemo, useState } from "react";
import { formatBytes } from "../lib/fileTransfer.js";
import { clearHistory } from "../lib/history.js";
import "./HistoryPanel.css";

function formatWhen(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} · ${time}`;
}

export default function HistoryPanel({ entries, onClose, onClear }) {
  const [filter, setFilter] = useState("all"); // all | sent | received
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.direction !== filter) return false;
      if (query.trim() && !e.fileName.toLowerCase().includes(query.trim().toLowerCase()) && !e.peerName.toLowerCase().includes(query.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [entries, filter, query]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="history-panel" onClick={(e) => e.stopPropagation()}>
        <div className="history-panel__header">
          <h2>History</h2>
          <button className="panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="history-panel__controls">
          <input
            className="history-panel__search"
            placeholder="Search file or device…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="history-panel__filters">
            {["all", "sent", "received"].map((f) => (
              <button
                key={f}
                className={`history-filter-btn ${filter === f ? "history-filter-btn--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "sent" ? "Sent" : "Received"}
              </button>
            ))}
          </div>
        </div>

        <div className="history-panel__list">
          {filtered.length === 0 && <p className="history-panel__empty">No transfers yet.</p>}
          {filtered.map((e, i) => (
            <div key={`${e.at}-${i}`} className="history-row">
              <span className={`history-row__icon history-row__icon--${e.direction}`}>
                {e.direction === "sent" ? "↑" : "↓"}
              </span>
              <div className="history-row__mid">
                <span className="history-row__name">{e.fileName}</span>
                <span className="history-row__meta mono">
                  {e.direction === "sent" ? "To" : "From"} {e.peerName} · {formatBytes(e.size)}
                </span>
              </div>
              <span className="history-row__when">{formatWhen(e.at)}</span>
            </div>
          ))}
        </div>

        {entries.length > 0 && (
          <button
            className="btn-ghost history-panel__clear"
            onClick={() => {
              clearHistory();
              onClear?.();
            }}
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  );
}
