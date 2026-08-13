import { useEffect } from "react";
import { createPortal } from "react-dom";

const CONFETTI_COLORS = ["#f472b6", "#fb923c", "#60a5fa", "#34d399", "#facc15", "#a78bfa", "#f87171"];
const BALLOON_COLORS = ["#ef4444", "#f97316", "#ef4444", "#dc2626", "#fb7185", "#ea580c"];

const CONFETTI = Array.from({ length: 48 }, (_, i) => ({
  left: `${(i * 9.7 + (i % 5) * 3) % 100}%`,
  delay: `${((i * 0.09) % 1.4).toFixed(2)}s`,
  duration: `${(2.2 + (i % 6) * 0.28).toFixed(2)}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  w: 5 + (i % 4) * 2,
  h: 8 + (i % 3) * 3,
  rot: (i * 37) % 360,
}));

const BALLOONS = Array.from({ length: 7 }, (_, i) => ({
  left: `${6 + i * 13}%`,
  delay: `${(i * 0.18).toFixed(2)}s`,
  duration: `${(3.6 + (i % 3) * 0.4).toFixed(2)}s`,
  color: BALLOON_COLORS[i % BALLOON_COLORS.length],
  drift: i % 2 === 0 ? "-4deg" : "4deg",
}));

function getOverlayRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

export function ChampionCelebrationOverlay({ user, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const overlay = (
    <div className="ua-cp-champion-celebrate" onClick={onClose} role="presentation" aria-hidden="true">
      <div className="ua-cp-champion-celebrate__layer">
        {CONFETTI.map((piece, i) => (
          <span
            key={`confetti-${i}`}
            className="ua-cp-champion-celebrate__confetti"
            style={{
              left: piece.left,
              width: piece.w,
              height: piece.h,
              background: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              transform: `rotate(${piece.rot}deg)`,
            }}
          />
        ))}
        {BALLOONS.map((balloon, i) => (
          <span
            key={`balloon-${i}`}
            className="ua-cp-champion-celebrate__balloon"
            style={{
              left: balloon.left,
              background: balloon.color,
              animationDelay: balloon.delay,
              animationDuration: balloon.duration,
              ["--ua-balloon-drift"]: balloon.drift,
            }}
          />
        ))}
        <div className="ua-cp-champion-celebrate__icons">
          <span>🎉</span>
          <span>🏆</span>
          <span>🎉</span>
        </div>
        <div className="ua-cp-champion-celebrate__banner" onClick={(e) => e.stopPropagation()}>
          <span className="ua-cp-champion-celebrate__label">Champion of the month</span>
          <strong>{user.name} 🥇</strong>
        </div>
      </div>
    </div>
  );

  const root = getOverlayRoot();
  return root ? createPortal(overlay, root) : overlay;
}
