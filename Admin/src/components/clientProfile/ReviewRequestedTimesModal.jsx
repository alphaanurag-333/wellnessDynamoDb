import { useEffect } from "react";
import { createPortal } from "react-dom";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function padTime(date) {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = date.getHours() >= 12 ? "PM" : "AM";
  return `${hours}:${minutes} ${meridiem}`;
}

function formatSlotLabel(startIso, endIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const end = endIso ? new Date(endIso) : null;
  const date = `${String(start.getDate()).padStart(2, "0")} ${start.toLocaleString("en-GB", { month: "short" })}`;
  const range = end && !Number.isNaN(end.getTime())
    ? `${padTime(start)}–${padTime(end)}`
    : padTime(start);
  return `${date} · ${range}`;
}

function weekdayLabel(startIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  return start.toLocaleString("en-GB", { weekday: "short" });
}

function isPastSlot(startIso) {
  const start = new Date(startIso);
  return Number.isNaN(start.getTime()) || start.getTime() <= Date.now();
}

/**
 * Coach picks one of the client's requested alternate times.
 */
export function ReviewRequestedTimesModal({
  userName,
  stepLabel,
  slots = [],
  busy = false,
  onClose,
  onAccept,
  onReject,
}) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const count = slots.length;
  const firstName = String(userName || "Client").trim().split(/\s+/)[0] || "Client";

  const modal = (
    <div
      className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="ua-cp-modal ua-cp-review-times-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="review-requested-times-title"
      >
        <div className="ua-cp-modal__head">
          <div>
            <div id="review-requested-times-title" className="ua-cp-modal__title">
              Client requested times
            </div>
            <div className="ua-cp-modal__sub">
              {firstName}
              {stepLabel ? ` · ${stepLabel}` : ""}
              {count ? ` · ${count} option${count === 1 ? "" : "s"}` : ""}
            </div>
          </div>
          <button
            type="button"
            className="ua-cp-modal__close"
            onClick={() => {
              if (!busy) onClose?.();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ua-cp-modal__body ua-cp-review-times-modal__body">
          <p className="ua-cp-review-times-modal__hint">
            Pick one time to confirm the meeting, or reject to keep your offered slots.
          </p>

          <div className="ua-cp-review-times-modal__list">
            {slots.map((slot, index) => {
              const label = formatSlotLabel(slot.startAt, slot.endAt) || slot.id;
              const day = weekdayLabel(slot.startAt);
              const past = isPastSlot(slot.startAt);
              return (
                <div key={slot.id || index} className="ua-cp-review-times-modal__row">
                  <div className="ua-cp-review-times-modal__copy">
                    {day ? (
                      <span className="ua-cp-review-times-modal__day">{day}</span>
                    ) : null}
                    <strong>{label}</strong>
                    {past ? (
                      <span className="ua-cp-review-times-modal__hint">Past time — cannot accept</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="ua-cp-onboard-step__btn ua-cp-onboard-step__btn--green"
                    disabled={busy || past}
                    onClick={() => onAccept?.(slot)}
                  >
                    Accept
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ua-cp-review-times-modal__footer">
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--outline"
            disabled={busy}
            onClick={() => {
              if (!busy) onClose?.();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ua-cp-onboard-step__btn ua-cp-onboard-step__btn--ghost"
            disabled={busy}
            onClick={() => onReject?.()}
          >
            Reject all
          </button>
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(modal, root) : modal;
}
