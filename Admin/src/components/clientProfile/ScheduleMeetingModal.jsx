import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DURATION_OPTIONS, HOLD_OPTIONS } from "../../data/launchData.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_FROM_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CAL_DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DEMO_TODAY = new Date();

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
  const day = WEEKDAY_FROM_SUN[date.getDay()];
  return `${day} · ${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()].toUpperCase()}`;
}

function padTimePart(n) {
  return String(n).padStart(2, "0");
}

function nextRoundedStartTime(date = new Date()) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${padTimePart(next.getHours())}:${padTimePart(next.getMinutes())}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`;
}

function dateKeyFromSlot(slot) {
  if (slot?.dateKey) return slot.dateKey;
  if (slot?.startAt) {
    const date = new Date(slot.startAt);
    if (!Number.isNaN(date.getTime())) return formatDateKey(date);
  }
  return slot?.dateLabel || "";
}

function uniqueDateCount(slots) {
  return new Set((slots || []).map(dateKeyFromSlot).filter(Boolean)).size;
}

function slotFromIso(slot) {
  const start = new Date(slot.startAt || slot.start_at);
  const end = new Date(slot.endAt || slot.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const fromTime = `${padTimePart(start.getHours())}:${padTimePart(start.getMinutes())}`;
  const toTime = `${padTimePart(end.getHours())}:${padTimePart(end.getMinutes())}`;
  return {
    key: slot.id || `${start.toISOString()}-${end.toISOString()}`,
    dateKey: formatDateKey(start),
    dateLabel: formatShortDate(start),
    range: `${fromTime}–${toTime}`,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

function slotsFromMeeting(meeting) {
  return (meeting?.slots || []).map(slotFromIso).filter(Boolean);
}

function groupSlotsByDate(slots) {
  const groups = [];
  const map = new Map();
  for (const slot of slots || []) {
    const key = dateKeyFromSlot(slot);
    if (!key) continue;
    if (!map.has(key)) {
      const group = { key, dateLabel: slot.dateLabel, slots: [] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).slots.push(slot);
  }
  groups.sort((a, b) => a.key.localeCompare(b.key));
  return groups;
}

export function MiniCalendar({ value, onChange, onClear, onToday }) {
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    const items = [];
    for (let i = startPad; i > 0; i -= 1) {
      items.push({ date: new Date(viewYear, viewMonth - 1, prevMonthDays - i + 1), outside: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ date: new Date(viewYear, viewMonth, day), outside: false });
    }
    let nextDay = 1;
    while (items.length % 7 !== 0) {
      items.push({ date: new Date(viewYear, viewMonth + 1, nextDay), outside: true });
      nextDay += 1;
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
        <span>{MONTH_FULL[viewMonth]}, {viewYear}</span>
        <button type="button" className="ua-cp-launch-modal__calendar-nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="ua-cp-launch-modal__calendar-grid">
        {CAL_DOW.map((label) => (
          <span key={label} className="ua-cp-launch-modal__calendar-dow">{label}</span>
        ))}
        {cells.map((cell, index) => {
          const { date, outside } = cell;
          const selected = sameDay(date, value);
          const today = sameDay(date, DEMO_TODAY);
          return (
            <button
              key={`${date.toISOString()}-${index}`}
              type="button"
              className={`ua-cp-launch-modal__calendar-day${selected ? " ua-cp-launch-modal__calendar-day--selected" : ""}${today ? " ua-cp-launch-modal__calendar-day--today" : ""}${outside ? " ua-cp-launch-modal__calendar-day--outside" : ""}`}
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
  existingMeeting = null,
  onClose,
  onSend,
}) {
  const laterWrapRef = useRef(null);
  const upcomingDates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index + 1);
      return {
        id: `d${index}`,
        day: WEEKDAY_FROM_SUN[date.getDay()].toUpperCase(),
        date,
        dateLabel: String(date.getDate()).padStart(2, "0"),
      };
    });
  }, []);

  const [dateMode, setDateMode] = useState("preset");
  const [selectedPreset, setSelectedPreset] = useState("d0");
  const [laterDate, setLaterDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [laterOpen, setLaterOpen] = useState(false);
  const [duration, setDuration] = useState(
    Number(existingMeeting?.durationMinutes) || defaultDuration,
  );
  const [hold, setHold] = useState("24 hours");
  const [note, setNote] = useState(existingMeeting?.coachNote || defaultNote);
  const [fromTime, setFromTime] = useState(() => nextRoundedStartTime());
  const [toTime, setToTime] = useState(() => formatSlotEnd(nextRoundedStartTime(), Number(existingMeeting?.durationMinutes) || defaultDuration));
  const [slots, setSlots] = useState(() => slotsFromMeeting(existingMeeting));
  const dateCount = uniqueDateCount(slots);
  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);

  useEffect(() => {
    const next = slotsFromMeeting(existingMeeting);
    if (!next.length) return;
    setSlots((prev) => (prev.length ? prev : next));
    if (existingMeeting?.coachNote) setNote(existingMeeting.coachNote);
    if (existingMeeting?.durationMinutes) {
      setDuration(Number(existingMeeting.durationMinutes));
    }
  }, [existingMeeting]);

  const preset = useMemo(
    () => upcomingDates.find((d) => d.id === selectedPreset) || upcomingDates[0],
    [selectedPreset, upcomingDates],
  );

  const activeDate = dateMode === "preset" ? preset.date : laterDate;

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

  function buildSlotFromForm() {
    if (!fromTime) return null;
    const end = toTime || formatSlotEnd(fromTime, duration);
    const [startH, startM] = fromTime.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    if (![startH, startM, endH, endM].every(Number.isFinite)) return null;
    const startAt = new Date(activeDate);
    startAt.setHours(startH, startM, 0, 0);
    const endAt = new Date(activeDate);
    endAt.setHours(endH, endM, 0, 0);
    if (endAt.getTime() <= startAt.getTime()) return null;
    const slotKey = `${startAt.toISOString()}-${endAt.toISOString()}`;
    return {
      key: slotKey,
      dateKey: formatDateKey(activeDate),
      dateLabel: slotsDayLabel,
      range: `${fromTime}–${end}`,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    };
  }

  function addSlot() {
    const slot = buildSlotFromForm();
    if (!slot) return;
    setSlots((prev) => {
      if (prev.some((s) => s.key === slot.key)) return prev;
      return [...prev, slot];
    });
    setFromTime("");
    setToTime("");
  }

  function removeSlot(key) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  function handleSend() {
    const pending = buildSlotFromForm();
    const nextSlots = [...slots];
    if (pending && !nextSlots.some((s) => s.key === pending.key)) {
      nextSlots.push(pending);
      setSlots(nextSlots);
    }
    if (!nextSlots.length) return;
    onSend?.({ slots: nextSlots, note, hold, duration, date: activeDate });
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
              {upcomingDates.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`ua-cp-launch-modal__date${dateMode === "preset" && selectedPreset === d.id ? " ua-cp-launch-modal__date--active" : ""}`}
                  onClick={() => selectPreset(d.id)}
                >
                  <span>{d.day}</span>
                  <strong>{d.dateLabel}</strong>
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
                      selectPreset("d0");
                    }}
                    onToday={() => selectLaterDate(new Date())}
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
                  readOnly
                  tabIndex={-1}
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
                <select
                  value={duration}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDuration(next);
                    if (fromTime) setToTime(formatSlotEnd(fromTime, next));
                  }}
                >
                  {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
            </div>
            {slots.length ? (
              <div className="ua-cp-launch-modal__offering">
                <strong>Offering {slots.length} slot(s) across {dateCount} date(s)</strong>
                <div className="ua-cp-launch-modal__slot-groups">
                  {slotsByDate.map((group) => (
                    <div key={group.key} className="ua-cp-launch-modal__slot-date-group">
                      <span className="ua-cp-launch-modal__slot-date-label">{group.dateLabel}</span>
                      <div className="ua-cp-launch-modal__slot-tags">
                        {group.slots.map((s) => (
                          <span key={s.key} className="ua-cp-launch-modal__slot-tag">
                            {s.range}
                            <button type="button" onClick={() => removeSlot(s.key)} aria-label="Remove">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
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
          <span>
            {slots.length
              ? `${slots.length} slot${slots.length === 1 ? "" : "s"} held across ${dateCount} date${dateCount === 1 ? "" : "s"}`
              : fromTime
                ? "Ready to send the time above"
                : "Pick a start time, then send"}
          </span>
          <div>
            <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary"
              disabled={!slots.length && !fromTime}
              onClick={handleSend}
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
