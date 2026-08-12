import { useMemo, useState } from "react";
import { DURATION_OPTIONS, HOLD_OPTIONS, SCHEDULE_DATES } from "../../data/launchData.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatSlotEnd(fromTime, durationMin) {
  const [h, m] = fromTime.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function ScheduleMeetingModal({
  user,
  title,
  defaultNote,
  defaultDuration = 45,
  onClose,
  onSend,
}) {
  const [selectedDate, setSelectedDate] = useState("tue");
  const [duration, setDuration] = useState(defaultDuration);
  const [hold, setHold] = useState("24 hours");
  const [note, setNote] = useState(defaultNote);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [slots, setSlots] = useState([]);

  const selected = useMemo(
    () => SCHEDULE_DATES.find((d) => d.id === selectedDate) || SCHEDULE_DATES[0],
    [selectedDate],
  );

  const dateLabel = `${selected.day.charAt(0) + selected.day.slice(1).toLowerCase()} · ${selected.date} ${MONTH_LABELS[7]} 2026`;

  function addSlot() {
    if (!fromTime) return;
    const end = toTime || formatSlotEnd(fromTime, duration);
    setSlots([{ date: selectedDate, dateLabel: `${selected.date} Aug`, range: `${fromTime}–${end}` }]);
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-modal--launch" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="schedule-meeting-title">
        <div className="ua-cp-launch-modal__head">
          <div className="ua-cp-launch-modal__icon">📅</div>
          <div>
            <div id="schedule-meeting-title" className="ua-cp-modal__title">{title}</div>
            <div className="ua-cp-modal__sub">With {user.name} · offer a few slots, they pick one</div>
          </div>
          <button type="button" className="ua-cp-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="ua-cp-launch-modal__section">
          <div className="ua-cp-launch-modal__row-label">
            <span>Date</span>
            <span>{dateLabel}</span>
          </div>
          <div className="ua-cp-launch-modal__dates">
            {SCHEDULE_DATES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`ua-cp-launch-modal__date${selectedDate === d.id ? " ua-cp-launch-modal__date--active" : ""}`}
                onClick={() => setSelectedDate(d.id)}
              >
                <span>{d.day}</span>
                <strong>{d.date}</strong>
              </button>
            ))}
            <button type="button" className="ua-cp-launch-modal__later">
              Later
              <span>04-08-2026 📅</span>
            </button>
          </div>
        </div>

        <div className="ua-cp-launch-modal__section">
          <div className="ua-cp-launch-modal__row-label">
            <span>Slots to offer · {selected.date} AUG</span>
            <span className="ua-cp-launch-modal__hint">Set a start time — the end fills in from the duration</span>
          </div>
          <div className="ua-cp-launch-modal__slot-row">
            <label>
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
            <label>
              to
              <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} placeholder="--:--" />
            </label>
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" disabled={!fromTime} onClick={addSlot}>+ Add slot</button>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          {slots.length ? (
            <div className="ua-cp-launch-modal__offering">
              <strong>Offering {slots.length} slot(s) across 1 date(s)</strong>
              {slots.map((s) => (
                <span key={s.range} className="ua-cp-launch-modal__slot-tag">
                  {s.dateLabel} {s.range}
                  <button type="button" onClick={() => setSlots([])} aria-label="Remove">×</button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="ua-cp-launch-modal__section">
          <span className="ua-cp-launch-modal__label">Hold expires if no reply</span>
          <div className="ua-cp-launch-modal__holds">
            {HOLD_OPTIONS.map((h) => (
              <button key={h} type="button" className={`ua-cp-launch-modal__hold${hold === h ? " ua-cp-launch-modal__hold--active" : ""}`} onClick={() => setHold(h)}>{h}</button>
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

        <div className="ua-cp-launch-modal__foot">
          <span>{slots.length ? `${slots.length} slot held across 1 date` : "Nothing held yet"}</span>
          <div>
            <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary"
              disabled={!slots.length}
              onClick={() => onSend?.({ slots, note, hold, duration })}
            >
              Send slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
