import { useEffect } from "react";
import { createPortal } from "react-dom";

const TONE_COLOR = {
  blue: "#5e6ad2",
  teal: "#0d9488",
  gold: "#d4a017",
  sky: "#38bdf8",
  orange: "#ec7a45",
};

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

export function DailyMetricModal({ metric, onClose, onNavigate }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!metric?.modal) return null;

  const { modal } = metric;
  const accent = TONE_COLOR[metric.tone] || TONE_COLOR.blue;
  const breakdown = modal.todayBreakdown;

  const overlay = (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-daily-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="daily-metric-title"
      >
        <div className="ua-cp-daily-modal__head">
          <div className="ua-cp-daily-modal__identity">
            <span className="ua-cp-daily-modal__icon">{metric.icon}</span>
            <div>
              <div id="daily-metric-title" className="ua-cp-daily-modal__title">{metric.label}</div>
              <div className="ua-cp-daily-modal__sub">Last 5 records</div>
            </div>
          </div>
          <button type="button" className="ua-cp-daily-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {breakdown ? (
          <div className="ua-cp-daily-modal__breakdown">
            <div className="ua-cp-daily-modal__breakdown-head">
              <div className="ua-cp-daily-modal__breakdown-main">
                <span className="ua-cp-daily-modal__breakdown-icon">{metric.icon}</span>
                <div>
                  <strong>{breakdown.title}</strong>
                  <span>{breakdown.sub}</span>
                </div>
              </div>
              <div className="ua-cp-daily-modal__breakdown-pct">
                <strong style={{ color: accent }}>{breakdown.pct}%</strong>
                <span>{breakdown.pctLabel}</span>
              </div>
            </div>
            <div className="ua-cp-daily-modal__breakdown-track">
              <span style={{ width: `${breakdown.barPct}%`, background: accent }} />
            </div>
            <div className="ua-cp-daily-modal__breakdown-items">
              {breakdown.items.map((item) => (
                <span key={item.label}>
                  <span>{item.icon}</span> {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="ua-cp-daily-modal__records">
          {modal.records.map((row) => (
            <div
              key={row.when}
              className={`ua-cp-daily-modal__row${row.today ? " ua-cp-daily-modal__row--today" : ""}`}
            >
              <span>{row.when}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="ua-cp-btn ua-cp-btn--primary ua-cp-daily-modal__footer"
          onClick={() => {
            onClose?.();
            onNavigate?.(modal.footerSection);
          }}
        >
          {modal.footerLabel}
        </button>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(overlay, root) : overlay;
}
