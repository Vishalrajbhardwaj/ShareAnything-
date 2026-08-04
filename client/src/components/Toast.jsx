import { useEffect } from "react";
import "./Toast.css";

export default function Toast({ message, onClose, duration = 1800 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__icon">✓</span>
      <span className="toast__msg">{message}</span>
    </div>
  );
}
