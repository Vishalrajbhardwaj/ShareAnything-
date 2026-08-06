// Reusable avatar renderer. The server now issues avatar IMAGE URLs (e.g.
// "/avatars/marvel/iron-man.webp") for each character name. If the value looks
// like an image path we render an <img>; otherwise we fall back to rendering
// the value as a text/emoji glyph so nothing breaks with older data.
// If an image fails to load (e.g. the asset isn't deployed yet), we gracefully
// fall back to a styled initial-letter badge instead of a broken image icon.
import { useState } from "react";
import { characterTheme, avatarColor } from "../lib/avatars.js";

export default function Avatar({ value, alt = "", className = "", style = undefined }) {
  const [failed, setFailed] = useState(false);

  // Character-based theme: each avatar gets its character's colors + a themed
  // animation class so avatars look unique & alive everywhere (radar, chat, send).
  const theme = characterTheme(alt);
  const themeClass = `char-avatar char-avatar--${theme.label}`;
  const themeVars = {
    "--tc1": theme.c1,
    "--tc2": theme.c2,
    "--peer-color": avatarColor(alt),
  };

  const isImage =
    !failed && typeof value === "string" && /\.(webp|png|jpe?g|gif|svg|avif)(\?|#|$)/i.test(value);

  if (isImage) {
    return (
      <span className={`avatar-img ${themeClass} ${className}`.trim()} style={{ ...style, ...themeVars }}>
        <img
          src={value}
          alt={alt || "avatar"}
          draggable={false}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  // Fallback: for image path values that failed to load, show the character's
  // initial letter. For legacy emoji/text values, show the glyph directly.
  const fallbackText = failed ? (alt || "avatar").trim().charAt(0).toUpperCase() : value || "◆";

  return (
    <span className={`avatar-glyph ${themeClass} ${className}`.trim()} style={{ ...style, ...themeVars }}>
      {fallbackText}
    </span>
  );
}
