import { useEffect } from "react";
import "./Toast.css";

const ICONS = {
  info: "ℹ️",
  success: "✓",
  error: "⚠️",
};

export default function Toast({ message, onClose, duration = 1800, variant = "success" }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className={`toast toast--${variant}`} role="status" aria-live="polite">
      <span className="toast__icon">{ICONS[variant] ?? ICONS.success}</span>
      <span className="toast__msg">{message}</span>
    </div>
  );
}
