import { useEffect, useRef, useState } from "react";

// Full-screen animated effects that play when a device connects/joins or a
// profile appears. A random effect is chosen each time — a quick flash/blink,
// a water ripple, an electric surge, or a sound-wave burst — so the radar always
// feels alive without being repetitive.
const EFFECTS = ["flash", "water", "electric", "sound"];

export default function ScreenEffects({ trigger, onSettled }) {
  const [active, setActive] = useState(null);
  const timeoutRef = useRef(null);

  // When `trigger` increments, roll a random effect and play it once.
  useEffect(() => {
    if (!trigger) return;
    const pick = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
    setActive(pick);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActive(null);
      onSettled?.();
    }, 1400);
    return () => clearTimeout(timeoutRef.current);
  }, [trigger, onSettled]);

  if (!active) return null;

  return (
    <div className={`screen-effect screen-effect--${active}`} aria-hidden="true">
      {active === "flash" && <span className="screen-effect__flash" />}
      {active === "water" && (
        <span className="screen-effect__water">
          <i className="screen-effect__ring screen-effect__ring--1" />
          <i className="screen-effect__ring screen-effect__ring--2" />
          <i className="screen-effect__ring screen-effect__ring--3" />
        </span>
      )}
      {active === "electric" && (
        <span className="screen-effect__electric">
          <i className="screen-effect__bolt screen-effect__bolt--1" />
          <i className="screen-effect__bolt screen-effect__bolt--2" />
          <i className="screen-effect__bolt screen-effect__bolt--3" />
        </span>
      )}
      {active === "sound" && (
        <span className="screen-effect__sound">
          <i className="screen-effect__bar screen-effect__bar--1" />
          <i className="screen-effect__bar screen-effect__bar--2" />
          <i className="screen-effect__bar screen-effect__bar--3" />
          <i className="screen-effect__bar screen-effect__bar--4" />
          <i className="screen-effect__bar screen-effect__bar--5" />
        </span>
      )}
    </div>
  );
}

