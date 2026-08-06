import { useEffect, useState } from "react";
import { AVATAR_SETS, FRANCHISES, avatarColor } from "../lib/avatars.js";

function initial(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}
import { getPrefs, setPref } from "../lib/settings.js";
import { requestNotificationPermission } from "../lib/notifications.js";
import { SOUND_THEMES, playTheme } from "../lib/sounds.js";
import Avatar from "./Avatar.jsx";
import "./ProfileModal.css";

const THEME_KEY = "saa-theme";
const NOTIF_KEY = "saa-notifications";

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
}

export default function ProfileModal({
  self,
  netCode,
  onClose,
  onUpdateProfile,
  onSetNetworkMode,
  initialTab = "profile",
}) {
  const [tab, setTab] = useState(initialTab);
  const [nameDraft, setNameDraft] = useState(self?.name ?? "");
  const [status, setStatus] = useState(self?.status ?? "Ready to share");
  const [theme, setTheme] = useState(loadTheme);
const [notifications, setNotifications] = useState(() => {
    try {
      return localStorage.getItem(NOTIF_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [prefs, setPrefsState] = useState(() => getPrefs());
  const [ip, setIp] = useState(null);

  function togglePref(key) {
    const next = !prefs[key];
    setPrefsState(setPref(key, next));
  }

  // Apply theme to <html> and persist it.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // A simple, offline-friendly way to show the local IP / LAN address.
  useEffect(() => {
    let cancelled = false;
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("ip");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          pc.onicecandidate = (e) => {
            if (!e.candidate || cancelled) return;
            const m = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
            if (m) setIp(m[1]);
          };
        });
    } catch {
      // WebRTC not available — fall back to hostname
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape key.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function commitName() {
    const clean = nameDraft.trim();
    if (clean && clean !== self?.name) onUpdateProfile({ name: clean });
  }

  function commitStatus() {
    const clean = status.trim();
    if (clean && clean !== self?.status) onUpdateProfile({ status: clean });
  }

  function toggleNotifications() {
    const next = !notifications;
    setNotifications(next);
    try {
      localStorage.setItem(NOTIF_KEY, next ? "on" : "off");
    } catch {
      // ignore
    }
  }

  function restart() {
    window.location.reload();
  }

  const accent = avatarColor(self?.avatar);

  return (
    <div className="modal-backdrop pm-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="profile-modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Tabs */}
        <div className="profile-modal__tabs">
          <button
            className={`profile-modal__tab ${tab === "profile" ? "profile-modal__tab--active" : ""}`}
            onClick={() => setTab("profile")}
          >
            👤 Profile
          </button>
          <button
            className={`profile-modal__tab ${tab === "settings" ? "profile-modal__tab--active" : ""}`}
            onClick={() => setTab("settings")}
          >
            ⚙️ Settings
          </button>
        </div>

        {tab === "profile" ? (
          <div className="profile-modal__body">
            {/* Cover banner */}
            <div className="profile-cover">
              <div className="profile-cover__glow" style={{ background: `radial-gradient(circle at 30% 20%, ${accent}, transparent 60%)` }} />
            </div>

{/* Identity */}
            <div className="profile-identity">
              <div className="profile-identity__avatar" style={{ background: accent }}>
                <Avatar value={self?.avatar} alt={self?.name} />
              </div>
              <div className="profile-identity__fields">
                <input
                  className="profile-identity__name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => e.key === "Enter" && commitName()}
                  maxLength={24}
                  aria-label="Your name"
                />
                <input
                  className="profile-identity__status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  onBlur={commitStatus}
                  onKeyDown={(e) => e.key === "Enter" && commitStatus()}
                  maxLength={40}
                  aria-label="Status"
                />
              </div>
            </div>

{/* Avatar gallery — grouped by franchise */}
            <div className="profile-section">
              <p className="profile-section__label">Choose an avatar</p>
              {FRANCHISES.map((franchise) => (
                <div className="profile-franchise" key={franchise.label}>
                  <p className="profile-franchise__title">
                    <span>{franchise.icon}</span> {franchise.label}
                  </p>
                  <div className="profile-avatars">
                    {franchise.names.map((glyphName) => {
                      const paths = AVATAR_SETS[glyphName] || [];
                      const glyphPath = paths[0];
                      const isActive = !!glyphPath && self?.avatar === glyphPath;
                      return (
                        <button
                          key={glyphName}
                          type="button"
                          className={`profile-avatar-swatch ${isActive ? "profile-avatar-swatch--active" : ""}`}
                          style={isActive ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                          onClick={() => {
                            // When an avatar/icon is picked, also update the name to
                            // match that character so the radar theme follows along.
                            setNameDraft(glyphName);
                            onUpdateProfile({ avatar: glyphPath || "", name: glyphName });
                          }}
                          aria-label={`Use avatar ${glyphName}`}
                          title={glyphName}
                        >
                          {glyphPath ? (
                            <img src={glyphPath} alt={glyphName} draggable={false} />
                          ) : (
                            <span className="profile-avatar-swatch__initial" style={{ background: avatarColor(glyphName) }}>
                              {initial(glyphName)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="profile-modal__body">
            {/* Appearance */}
            <div className="settings-row">
              <span className="settings-row__ic">🌗</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Dark Mode</p>
                <p className="settings-row__sub">Switch between dark and light appearance</p>
              </div>
              <button
                className={`switch ${theme === "light" ? "switch--on" : ""}`}
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                role="switch"
                aria-checked={theme === "light"}
                aria-label="Toggle dark mode"
              >
                <span className="switch__knob" />
              </button>
            </div>

{/* Notifications */}
            <div className="settings-row">
              <span className="settings-row__ic">🔔</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Notifications</p>
                <p className="settings-row__sub">Get notified for incoming transfers</p>
              </div>
              <button
                className={`switch ${notifications ? "switch--on" : ""}`}
                onClick={toggleNotifications}
                role="switch"
                aria-checked={notifications}
                aria-label="Toggle notifications"
              >
                <span className="switch__knob" />
              </button>
            </div>

            {/* Desktop Notifications */}
            <div className="settings-row">
              <span className="settings-row__ic">🖥️</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Desktop Alerts</p>
                <p className="settings-row__sub">System popups even when the tab is in the background</p>
              </div>
              <button
                className={`switch ${prefs.notifications ? "switch--on" : ""}`}
                onClick={() => {
                  const next = !prefs.notifications;
                  togglePref("notifications");
                  if (next) requestNotificationPermission();
                }}
                role="switch"
                aria-checked={prefs.notifications}
                aria-label="Toggle desktop alerts"
              >
                <span className="switch__knob" />
              </button>
            </div>

            {/* Sound alerts */}
            <div className="settings-row">
              <span className="settings-row__ic">🔊</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Sound Alerts</p>
                <p className="settings-row__sub">Play a sound for incoming and completed transfers</p>
              </div>
<button
                className={`switch ${prefs.sound ? "switch--on" : ""}`}
                onClick={() => togglePref("sound")}
                role="switch"
                aria-checked={prefs.sound}
                aria-label="Toggle sound alerts"
              >
                <span className="switch__knob" />
              </button>
            </div>

            {/* Sound theme picker */}
            <div className="settings-row settings-row--stack">
              <span className="settings-row__ic">🎵</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Sound Theme</p>
                <p className="settings-row__sub">Pick a sound for alerts &amp; tap ▶ to preview</p>
              </div>
              <div className="sound-theme-list">
                {SOUND_THEMES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sound-theme ${prefs.soundTheme === s.id ? "sound-theme--active" : ""}`}
                    onClick={() => setPrefsState(setPref("soundTheme", s.id))}
                    aria-pressed={prefs.soundTheme === s.id}
                  >
                    <span className="sound-theme__icon">{s.icon}</span>
                    <span className="sound-theme__label">{s.label}</span>
                    <span
                      className="sound-theme__preview"
                      role="button"
                      tabIndex={0}
                      aria-label={`Preview ${s.label} sound`}
                      onClick={(e) => {
                        e.stopPropagation();
                        playTheme(s.id, "preview");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          playTheme(s.id, "preview");
                        }
                      }}
                    >
                      ▶
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-accept from favorites */}
            <div className="settings-row">
              <span className="settings-row__ic">⚡</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Auto-accept Favorites</p>
                <p className="settings-row__sub">Automatically accept transfers from ⭐ favorite devices</p>
              </div>
              <button
                className={`switch ${prefs.autoAccept ? "switch--on" : ""}`}
                onClick={() => togglePref("autoAccept")}
                role="switch"
                aria-checked={prefs.autoAccept}
                aria-label="Toggle auto-accept favorites"
              >
                <span className="switch__knob" />
              </button>
            </div>

            {/* Network mode */}
            <div className="settings-row">
              <span className="settings-row__ic">{netCode ? "🔗" : "📶"}</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Network Mode</p>
                <p className="settings-row__sub">{netCode ? `Anywhere · Code ${netCode}` : "Local network"}</p>
              </div>
              <button
                className="settings-row__action"
                onClick={() => onSetNetworkMode(netCode ? "" : netCode || Math.random().toString(36).slice(2, 7).toUpperCase())}
              >
                {netCode ? "Switch to Local" : "Switch to Anywhere"}
              </button>
            </div>

            {/* IP Address */}
            <div className="settings-row">
              <span className="settings-row__ic">🖥️</span>
              <div className="settings-row__text">
                <p className="settings-row__title">IP Address</p>
                <p className="settings-row__sub mono">{ip ? ip : "Detecting…"}</p>
              </div>
            </div>

            {/* Restart */}
            <div className="settings-row">
              <span className="settings-row__ic">🔄</span>
              <div className="settings-row__text">
                <p className="settings-row__title">Restart App</p>
                <p className="settings-row__sub">Reload the application</p>
              </div>
              <button className="btn-ghost settings-row__action" onClick={restart}>
                Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
