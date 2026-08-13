import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DURATION_OPTIONS, HOLD_OPTIONS, SCHEDULE_DATES } from "../../data/launchData.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEMO_TODAY = new Date(2026, 7, 13);

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function formatSlotEnd(fromTime, durationMin) {
  const [h, m] = fromTime.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function formatDdMmYyyy(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

function formatDateLabel(date) {
  const day = DAY_LABELS[date.getDay()];
  return `${day} · ${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()].toUpperCase()}`;
}

function MiniCalendar({ value, onChange, onClear, onToday }) {
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const items = [];
    for (let i = 0; i < startPad; i += 1) items.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push(new Date(viewYear, viewMonth, day));
    }
    return items;
  }, [viewMonth, viewYear]);

  function shiftMonth(delta) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  }

  const sameDay = (a, b) => a && b
    && a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();

  return (
    <div className="ua-cp-launch-modal__calendar" role="dialog" aria-label="Pick a date">
      <div className="ua-cp-launch-modal__calendar-head">
        <button type="button" className="ua-cp-launch-modal__calendar-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
        <span>{MONTH_LABELS[viewMonth]} {viewYear}</span>
        <button type="button" className="ua-cp-launch-modal__calendar-nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="ua-cp-launch-modal__calendar-grid">
        {DAY_LABELS.map((label) => (
          <span key={label} className="ua-cp-launch-modal__calendar-dow">{label.slice(0, 2)}</span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`pad-${index}`} className="ua-cp-launch-modal__calendar-day ua-cp-launch-modal__calendar-day--empty" />;
          const selected = sameDay(date, value);
          const today = sameDay(date, DEMO_TODAY);
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={`ua-cp-launch-modal__calendar-day${selected ? " ua-cp-launch-modal__calendar-day--selected" : ""}${today ? " ua-cp-launch-modal__calendar-day--today" : ""}`}
              onClick={() => onChange(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="ua-cp-launch-modal__calendar-foot">
        <button type="button" onClick={onClear}>Clear</button>
        <button type="button" onClick={onToday}>Today</button>
      </div>
    </div>
  );
}

export function ScheduleMeetingModal({
  user,
  title,
  defaultNote,
  defaultDuration = 45,
  onClose,
  onSend,
}) {
  const laterWrapRef = useRef(null);
  const [dateMode, setDateMode] = useState("preset");
  const [selectedPreset, setSelectedPreset] = useState("tue");
  const [laterDate, setLaterDate] = useState(new Date(2026, 7, 4));
  const [laterOpen, setLaterOpen] = useState(false);
  const [duration, setDuration] = useState(defaultDuration);
  const [hold, setHold] = useState("24 hours");
  const [note, setNote] = useState(defaultNote);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [slots, setSlots] = useState([]);

  const preset = useMemo(
    () => SCHEDULE_DATES.find((d) => d.id === selectedPreset) || SCHEDULE_DATES[0],
    [selectedPreset],
  );

  const activeDate = dateMode === "preset"
    ? new Date(2026, 7, Number(preset.date))
    : laterDate;

  const dateLabel = formatDateLabel(activeDate);
  const slotsDayLabel = formatShortDate(activeDate);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!laterWrapRef.current?.contains(event.target)) {
        setLaterOpen(false);
      }
    }
    if (laterOpen) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [laterOpen]);

  function selectPreset(id) {
    setDateMode("preset");
    setSelectedPreset(id);
    setLaterOpen(false);
  }

  function selectLaterDate(date) {
    setDateMode("later");
    setLaterDate(date);
    setLaterOpen(false);
  }

  function addSlot() {
    if (!fromTime) return;
    const end = toTime || formatSlotEnd(fromTime, duration);
    const slotKey = `${activeDate.toISOString()}-${fromTime}-${end}`;
    setSlots((prev) => {
      if (prev.some((s) => s.key === slotKey)) return prev;
      return [...prev, {
        key: slotKey,
        dateLabel: slotsDayLabel,
        range: `${fromTime}–${end}`,
      }];
    });
    setFromTime("");
    setToTime("");
  }

  function removeSlot(key) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  const modal = (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-modal--launch"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="schedule-meeting-title"
      >
        <div className="ua-cp-launch-modal__head">
          <div className="ua-cp-launch-modal__icon">📅</div>
          <div className="ua-cp-launch-modal__head-copy">
            <div id="schedule-meeting-title" className="ua-cp-modal__title">{title}</div>
            <div className="ua-cp-modal__sub">With {user.name} · offer a few slots, they pick one</div>
          </div>
          <button type="button" className="ua-cp-modal__close ua-cp-launch-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="ua-cp-launch-modal__body">
          <div className="ua-cp-launch-modal__section">
            <div className="ua-cp-launch-modal__row-label">
              <span className="ua-cp-launch-modal__row-label-main">Date</span>
              <span className="ua-cp-launch-modal__row-label-meta">{dateLabel}</span>
            </div>
            <div className="ua-cp-launch-modal__dates">
              {SCHEDULE_DATES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`ua-cp-launch-modal__date${dateMode === "preset" && selectedPreset === d.id ? " ua-cp-launch-modal__date--active" : ""}`}
                  onClick={() => selectPreset(d.id)}
                >
                  <span>{d.day}</span>
                  <strong>{d.date}</strong>
                </button>
              ))}
              <div className="ua-cp-launch-modal__later-wrap" ref={laterWrapRef}>
                <button
                  type="button"
                  className={`ua-cp-launch-modal__later${dateMode === "later" ? " ua-cp-launch-modal__later--active" : ""}`}
                  onClick={() => {
                    setDateMode("later");
                    setLaterOpen((open) => !open);
                  }}
                >
                  <span className="ua-cp-launch-modal__later-label">Later</span>
                  <span className="ua-cp-launch-modal__later-date">
                    {formatDdMmYyyy(laterDate)}
                    <span aria-hidden="true">📅</span>
                  </span>
                </button>
                {laterOpen ? (
                  <MiniCalendar
                    value={laterDate}
                    onChange={selectLaterDate}
                    onClear={() => {
                      setLaterOpen(false);
                      selectPreset("tue");
                    }}
                    onToday={() => selectLaterDate(DEMO_TODAY)}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="ua-cp-launch-modal__section">
            <div className="ua-cp-launch-modal__row-label ua-cp-launch-modal__row-label--stack">
              <span className="ua-cp-launch-modal__row-label-main">Slots to offer · {slotsDayLabel}</span>
              <span className="ua-cp-launch-modal__hint">Set a start time — the end fills in from the duration</span>
            </div>
            <div className="ua-cp-launch-modal__slot-row">
              <label className="ua-cp-launch-modal__time-field">
                From
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => {
                    setFromTime(e.target.value);
                    if (e.target.value) setToTime(formatSlotEnd(e.target.value, duration));
                  }}
                />
              </label>
              <label className="ua-cp-launch-modal__time-field">
                to
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-launch-modal__add-slot"
                disabled={!fromTime}
                onClick={addSlot}
              >
                + Add slot
              </button>
              <label className="ua-cp-launch-modal__duration-field">
                Duration
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
            </div>
            {slots.length ? (
              <div className="ua-cp-launch-modal__offering">
                <strong>Offering {slots.length} slot(s) across 1 date(s)</strong>
                <div className="ua-cp-launch-modal__slot-tags">
                  {slots.map((s) => (
                    <span key={s.key} className="ua-cp-launch-modal__slot-tag">
                      {s.dateLabel} {s.range}
                      <button type="button" onClick={() => removeSlot(s.key)} aria-label="Remove">×</button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="ua-cp-launch-modal__section">
            <span className="ua-cp-launch-modal__label">Hold expires if no reply</span>
            <div className="ua-cp-launch-modal__holds">
              {HOLD_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`ua-cp-launch-modal__hold${hold === h ? " ua-cp-launch-modal__hold--active" : ""}`}
                  onClick={() => setHold(h)}
                >
                  {h}
                </button>
              ))}
            </div>
            <p className="ua-cp-launch-modal__hold-note">
              If {user.name.split(" ")[0]} does not pick a slot within {hold}, every held slot is released and your calendar frees up.
            </p>
          </div>

          <div className="ua-cp-launch-modal__section">
            <span className="ua-cp-launch-modal__label">Note for the client</span>
            <textarea className="ua-cp-launch-modal__note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="ua-cp-launch-modal__foot">
          <span>{slots.length ? `${slots.length} slot held across 1 date` : "Nothing held yet"}</span>
          <div>
            <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary"
              disabled={!slots.length}
              onClick={() => onSend?.({ slots, note, hold, duration, date: activeDate })}
            >
              Send slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(modal, root) : modal;
}
