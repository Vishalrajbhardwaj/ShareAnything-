import { useState } from "react";
import { AVATAR_SETS } from "../lib/avatars.js";
import Avatar from "./Avatar.jsx";
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
            <Avatar value={self?.avatar} alt={self?.name} />
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
          {Object.entries(AVATAR_SETS).flatMap(([glyphName, paths]) =>
            paths.map((glyphPath, idx) => (
              <button
                key={glyphPath}
                type="button"
                className={`avatar-swatch ${self?.avatar === glyphPath ? "avatar-swatch--active" : ""}`}
                onClick={() => onUpdateProfile({ avatar: glyphPath })}
                aria-label={`Use avatar ${glyphName} ${paths.length > 1 ? (idx + 1) : ""}`}
                title={paths.length > 1 ? `${glyphName} ${idx + 1}` : glyphName}
              >
                <Avatar value={glyphPath} alt={glyphName} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
