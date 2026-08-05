import { useState } from "react";
import "./AppNav.css";

const ITEMS = [
  { id: "receive", icon: "📡", label: "Receive" },
  { id: "send", icon: "📤", label: "Send" },
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "invite", icon: "🔗", label: "Invite" },
];

export default function AppNav({ view, onChangeView, stats = { sent: 0, received: 0, active: 0 }, connectionLabel }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      {/* Desktop Navigation Sidebar */}
      <nav
        className={`app-nav app-nav--sidebar ${collapsed ? "app-nav--collapsed" : ""}`}
        aria-label="Main Navigation"
      >
        <div
          className="app-nav__brand app-nav__brand--toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="app-nav__brand-mark">
            <span>⇄</span>
          </div>
          <span className="app-nav__brand-name">Share Anywhere</span>
        </div>

        <ul className="app-nav__list">
          {ITEMS.map((item) => {
            const isActive = view === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`app-nav__item ${isActive ? "app-nav__item--active" : ""}`}
                  onClick={() => onChangeView(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="app-nav__item-icon">{item.icon}</span>
                  <span className="app-nav__item-label">{item.label}</span>
                  {isActive && <span className="app-nav__active-pill" />}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Activity Summary Widget */}
        <div className="app-nav__activity">
          <div className="app-nav__activity-header">
            <p className="app-nav__activity-label">Live Activity</p>
            {stats.active > 0 && <span className="app-nav__activity-badge">{stats.active} Active</span>}
          </div>
          <div className="app-nav__activity-row">
            <div className="app-nav__stat">
              <span className="app-nav__activity-count">{stats.sent}</span>
              <span className="app-nav__activity-name">Sent</span>
            </div>
            <div className="app-nav__stat-divider" />
            <div className="app-nav__stat">
              <span className="app-nav__activity-count">{stats.received}</span>
              <span className="app-nav__activity-name">Received</span>
            </div>
            <div className="app-nav__stat-divider" />
            <div className="app-nav__stat">
              <span className="app-nav__activity-count highlight">{stats.active}</span>
              <span className="app-nav__activity-name">Active</span>
            </div>
          </div>
        </div>

        {/* Connection Status Indicator */}
        {connectionLabel && (
          <div className="app-nav__connection">
            <span className="app-nav__connection-dot" />
            <span className="app-nav__connection-text">{connectionLabel}</span>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="app-nav app-nav--bottom" aria-label="Mobile Navigation">
        {ITEMS.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`app-nav__tab ${isActive ? "app-nav__tab--active" : ""}`}
              onClick={() => onChangeView(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="app-nav__tab-content">
                <span className="app-nav__tab-icon">{item.icon}</span>
                <span className="app-nav__tab-label">{item.label}</span>
              </div>
              {isActive && <span className="app-nav__tab-indicator" />}
            </button>
          );
        })}
      </nav>
    </>
  );
}
