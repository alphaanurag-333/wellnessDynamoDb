import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { asCopyString } from "../../data/bannerConfigData.js";
import { BLOCK_CALENDARS, BLOCK_LENGTHS } from "../../data/calendarData.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function BlockTimeModal({
  dateLabel,
  start,
  defaultLength = 15,
  defaultWhat = "",
  onClose,
  onBlock,
  onChange,
}) {
  const lengthRef = useRef(null);
  const [what, setWhat] = useState(asCopyString(defaultWhat));
  const [calendar, setCalendar] = useState(BLOCK_CALENDARS[0]);
  const [length, setLength] = useState(defaultLength);
  const [lengthOpen, setLengthOpen] = useState(false);

  const lengthLabel = BLOCK_LENGTHS.find((entry) => entry.value === length)?.label || "15 minutes";

  function patch(nextWhat, nextLength) {
    onChange?.({
      label: asCopyString(nextWhat).trim(),
      length: nextLength,
    });
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      if (lengthOpen) setLengthOpen(false);
      else onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lengthOpen, onClose]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!lengthRef.current?.contains(event.target)) setLengthOpen(false);
    }
    if (lengthOpen) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [lengthOpen]);

  const modal = (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-modal--block"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="block-time-title"
      >
        <div className="ua-cp-launch-modal__head">
          <div className="ua-cp-launch-modal__icon">📅</div>
          <div className="ua-cp-launch-modal__head-copy">
            <div id="block-time-title" className="ua-cp-modal__title">Block time</div>
            <div className="ua-cp-modal__sub">{dateLabel} · from {start}</div>
          </div>
          <button type="button" className="ua-cp-modal__close ua-cp-launch-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="ua-cp-launch-modal__label">What is it</label>
        <input
          className="ua-cfg-vh-input"
          autoFocus
          placeholder="Team huddle, admin work, personal..."
          value={asCopyString(what)}
          onChange={(event) => {
            setWhat(event.target.value);
            patch(event.target.value, length);
          }}
        />

        <div className="ua-cal-block-modal__row">
          <label className="ua-cal-block-modal__field">
            <span className="ua-cp-launch-modal__label">Whose calendar</span>
            <span className="ua-cal-block-dd">
              <select
                className="ua-cfg-vh-input ua-cal-block-dd__native"
                value={asCopyString(calendar)}
                onChange={(event) => setCalendar(event.target.value)}
              >
                {BLOCK_CALENDARS.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
              <span className="ua-cal-block-dd__chevron"><Chevron /></span>
            </span>
          </label>
          <div className="ua-cal-block-modal__field ua-cal-block-modal__field--length" ref={lengthRef}>
            <span className="ua-cp-launch-modal__label">Length</span>
            <button
              type="button"
              className={`ua-cal-block-dd__btn${lengthOpen ? " is-open" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={lengthOpen}
              onClick={() => setLengthOpen((open) => !open)}
            >
              {lengthLabel}
              <Chevron />
            </button>
            {lengthOpen ? (
              <div className="ua-cal-block-dd__menu" role="listbox">
                {BLOCK_LENGTHS.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    role="option"
                    aria-selected={length === entry.value}
                    className={`ua-cal-block-dd__opt${length === entry.value ? " ua-cal-block-dd__opt--on" : ""}`}
                    onClick={() => {
                      setLength(entry.value);
                      setLengthOpen(false);
                      patch(what, entry.value);
                    }}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="ua-cal-block-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--primary"
            onClick={() => onBlock?.({
              label: asCopyString(what).trim() || "Blocked time",
              calendar: asCopyString(calendar),
              length,
              start,
            })}
          >
            Block it
          </button>
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(modal, root) : modal;
}
