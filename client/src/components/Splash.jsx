import { useEffect, useState } from "react";
import "./Splash.css";

export default function Splash({ onDone, minMs = 1400 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), minMs);
    const doneTimer = setTimeout(() => onDone?.(), minMs + 350);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [minMs, onDone]);

  return (
    <div className={`splash ${leaving ? "splash--leaving" : ""}`}>
      <div className="splash__rings" aria-hidden="true">
        <span className="splash__ring splash__ring--1" />
        <span className="splash__ring splash__ring--2" />
        <span className="splash__ring splash__ring--3" />
      </div>
      <div className="splash__mark">
        <span className="splash__mark-icon">⇄</span>
        <span className="splash__mark-loader" aria-hidden="true" />
      </div>
      <h1 className="splash__title">Share Anywhere</h1>
    </div>
  );
}
