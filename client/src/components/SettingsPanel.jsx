import { useState } from "react";
import { AVATARS } from "../lib/avatars.js";
import "./SettingsPanel.css";

export default function SettingsPanel({ self, netCode, onUpdateProfile, onSetNetworkMode }) {
  const [nameDraft, setNameDraft] = useState(self?.name ?? "");

  function commitName() {
    const clean = nameDraft.trim();
    if (clean && clean !== self?.name) onUpdateProfile({ name: clean });
  }

  return (
    <div className="settings-view">
      <div className="page-card settings-card settings-card--compact">
        <div className="settings-card__head settings-card__head--profile">
          <button className="profile-picker__avatar" type="button" aria-label="Avatar selection">
            {self?.avatar ?? "🧑‍💻"}
          </button>

          <input
            className="profile-picker__name mono"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
            maxLength={24}
          />
        </div>

        <div className="settings-card__actions">
          <button
            type="button"
            className="settings-card__icon"
            onClick={() => onSetNetworkMode(netCode ? netCode : "")}
            aria-label="Network mode"
            title={netCode ? "Anywhere mode" : "Local network mode"}
          >
            {netCode ? "🔗" : "📶"}
          </button>
          <button type="button" className="settings-card__icon" aria-label="Theme" title="Theme">
            🌙
          </button>
          <button type="button" className="settings-card__icon" aria-label="Notifications" title="Notifications">
            🔔
          </button>
        </div>

        <div className="settings-card__avatars">
          {AVATARS.map((glyph) => (
            <button
              key={glyph}
              type="button"
              className={`avatar-swatch ${self?.avatar === glyph ? "avatar-swatch--active" : ""}`}
              onClick={() => onUpdateProfile({ avatar: glyph })}
              aria-label={`Use avatar ${glyph}`}
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
