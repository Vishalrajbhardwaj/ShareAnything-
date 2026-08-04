import "./Header.css";

export default function Header({ self, connected, netCode, onOpenSettings, onSetNetworkMode, onOpenHistory }) {

  function randomCode() {
    return Math.random().toString(36).slice(2, 7);
  }

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark">⇄</span>
        <span className="app-header__title">Share Anywhere</span>
      </div>

      <div className="app-header__right">
        {/* DISCOVERY MODE — NOW ON FRONT PAGE! */}
        <div className="discovery-toggle">
          <button
            className={`discovery-toggle__btn ${!netCode ? "discovery-toggle__btn--active" : ""}`}
            onClick={() => onSetNetworkMode && onSetNetworkMode("")}
            title="Same Wi-Fi network"
            data-emoji="🌐"
            aria-label="Same Wi-Fi network"
          >
            🌐 Network
          </button>
          <button
            className={`discovery-toggle__btn ${netCode ? "discovery-toggle__btn--active" : ""}`}
            onClick={() => onSetNetworkMode && onSetNetworkMode(netCode || randomCode())}
            title="Anywhere via code"
            data-emoji="🔗"
            aria-label="Anywhere via code"
          >
            🔗 Anywhere
          </button>
        </div>

        <button className="app-header__icon-btn" onClick={onOpenHistory} title="History" aria-label="Transfer history">
          🕓
        </button>

        <span
          className={`status-dot ${connected ? "status-dot--on" : ""}`}
          title={connected ? "Connected" : "Connecting…"}
        />
        <button className="app-header__settings-btn" onClick={onOpenSettings}>
          {self ? (
            <>
              <span className="app-header__avatar">{self.avatar}</span>
              <span>{self.name}</span>
            </>
          ) : (
            "Settings"
          )}
        </button>
      </div>
    </header>
  );
}
