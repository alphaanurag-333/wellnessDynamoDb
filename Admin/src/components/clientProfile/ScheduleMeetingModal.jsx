import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DURATION_OPTIONS, HOLD_OPTIONS } from "../../data/launchData.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_FROM_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CAL_DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DEMO_TODAY = new Date();

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameCalendarDay(a, b) {
  return a && b
    && a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();
}

function isBeforeCalendarDay(date, minDate) {
  if (!date || !minDate) return false;
  return startOfDay(date).getTime() < startOfDay(minDate).getTime();
}

function combineDateAndTime(date, time24) {
  if (!date || !time24) return null;
  const [h, m] = String(time24).split(":").map(Number);
  if (![h, m].every(Number.isFinite)) return null;
  const next = new Date(date);
  next.setHours(h, m, 0, 0);
  return next;
}

/** Next 5-minute mark at least `minAheadMin` minutes from now (clock uses 5-min steps). */
function nextFutureClockTime(date, minAheadMin = 5) {
  const base = new Date();
  base.setMinutes(base.getMinutes() + minAheadMin, 0, 0);
  const rounded = Math.ceil(base.getMinutes() / 5) * 5;
  base.setMinutes(rounded, 0, 0);
  if (!isSameCalendarDay(date, base)) {
    return "09:00";
  }
  return `${padTimePart(base.getHours())}:${padTimePart(base.getMinutes())}`;
}

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

function getCalendarRoot() {
  return document.querySelector(".updated-admin") || document.body;
}

function placeCalendarPopover(anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(280, Math.max(240, window.innerWidth - 16));
  const height = 328;
  let left = rect.right - width;
  if (left < 8) left = 8;
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }
  let top = rect.bottom + 8;
  if (top + height > window.innerHeight - 8) {
    const above = rect.top - height - 8;
    top = above >= 8 ? above : Math.max(8, window.innerHeight - height - 8);
  }
  return { top, left, width };
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
  const start = new Date(slot.startAt || slot.start_at || slot.start || "");
  if (Number.isNaN(start.getTime())) return null;
  let end = new Date(slot.endAt || slot.end_at || slot.end || "");
  if (Number.isNaN(end.getTime())) {
    end = new Date(start.getTime() + 45 * 60000);
  }
  const fromTime = `${padTimePart(start.getHours())}:${padTimePart(start.getMinutes())}`;
  const toTime = `${padTimePart(end.getHours())}:${padTimePart(end.getMinutes())}`;
  return {
    key: slot.id || `${start.toISOString()}-${end.toISOString()}`,
    id: slot.id,
    dateKey: formatDateKey(start),
    dateLabel: formatShortDate(start),
    range: `${fromTime}–${toTime}`,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

export function slotsFromMeeting(meeting) {
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

function formatClockLabel(time24) {
  if (!time24) return "--:--";
  const [hRaw, m] = time24.split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h)) return "--:--";
  const h12 = h % 12 || 12;
  const ap = h >= 12 ? "PM" : "AM";
  return `${padTimePart(h12)}:${m} ${ap}`;
}

function parseTimeToDraft(time24) {
  const [hRaw, mRaw] = String(time24 || "09:00").split(":");
  const h24 = Number(hRaw);
  const mi = Number(mRaw);
  const safeH = Number.isFinite(h24) ? h24 : 9;
  const safeM = Number.isFinite(mi) ? mi : 0;
  return {
    h: (safeH % 12) || 12,
    m: safeM,
    ap: safeH >= 12 ? "PM" : "AM",
  };
}

function draftTo24(draft) {
  let h = draft.h % 12;
  if (draft.ap === "PM") h += 12;
  return `${padTimePart(h)}:${padTimePart(draft.m)}`;
}

const CLOCK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CALENDAR_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5h18v16H3z" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </svg>
);

function AnalogClockPicker({ target, initialTime, onCancel, onSet }) {
  const seed = parseTimeToDraft(initialTime || "09:00");
  const [step, setStep] = useState("h");
  const [draft, setDraft] = useState(seed);

  const nums = useMemo(() => (
    step === "h"
      ? Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: String(i + 1) }))
      : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, label: padTimePart(i * 5) }))
  ), [step]);

  // Clock position 0 = top (12 / 00), then clockwise by 30°.
  const selPos = step === "h"
    ? draft.h % 12
    : Math.round(draft.m / 5) % 12;
  const handDeg = selPos * 30 - 90;

  function pickNum(value) {
    if (step === "h") {
      setDraft((d) => ({ ...d, h: value }));
      setStep("m");
      return;
    }
    setDraft((d) => ({ ...d, m: value }));
  }

  return (
    <div className="ua-cp-clock-backdrop" onClick={onCancel} role="presentation">
      <div
        className="ua-cp-clock"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Pick a time"
      >
        <div className="ua-cp-clock__head">
          <div className="ua-cp-clock__digits">
            <button
              type="button"
              className={`ua-cp-clock__digit${step === "h" ? " ua-cp-clock__digit--on" : ""}`}
              onClick={() => setStep("h")}
            >
              {padTimePart(draft.h)}
            </button>
            <span className="ua-cp-clock__colon">:</span>
            <button
              type="button"
              className={`ua-cp-clock__digit${step === "m" ? " ua-cp-clock__digit--on" : ""}`}
              onClick={() => setStep("m")}
            >
              {padTimePart(draft.m)}
            </button>
          </div>
          <div className="ua-cp-clock__ampm">
            <button
              type="button"
              className={`ua-cp-clock__ampm-btn${draft.ap === "AM" ? " ua-cp-clock__ampm-btn--on" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, ap: "AM" }))}
            >
              AM
            </button>
            <button
              type="button"
              className={`ua-cp-clock__ampm-btn${draft.ap === "PM" ? " ua-cp-clock__ampm-btn--on" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, ap: "PM" }))}
            >
              PM
            </button>
          </div>
        </div>

        <div className="ua-cp-clock__face">
          <span className="ua-cp-clock__center" />
          <span className="ua-cp-clock__hand" style={{ transform: `rotate(${handDeg}deg)` }} />
          {nums.map((n, i) => {
            // Hours: index 0 = "1" at 1 o'clock; Minutes: index 0 = "00" at top.
            const pos = step === "h" ? (i + 1) % 12 : i;
            const ang = (pos * 30 - 90) * (Math.PI / 180);
            const r = 62;
            const x = 86 + r * Math.cos(ang);
            const y = 86 + r * Math.sin(ang);
            const on = pos === selPos;
            return (
              <button
                key={`${step}-${n.v}`}
                type="button"
                className={`ua-cp-clock__num${on ? " ua-cp-clock__num--on" : ""}`}
                style={{ left: x, top: y }}
                onClick={() => pickNum(n.v)}
              >
                {n.label}
              </button>
            );
          })}
        </div>

        <div className="ua-cp-clock__foot">
          <span>{step === "h" ? "Pick the hour" : "Pick the minutes"}</span>
          <div>
            <button type="button" className="ua-cp-clock__cancel" onClick={onCancel}>Cancel</button>
            <button type="button" className="ua-cp-clock__set" onClick={() => onSet(draftTo24(draft), target)}>Set</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MiniCalendar({ value, onChange, onClear, onToday, minDate = null, className = "", style, calendarRef }) {
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const minDay = minDate ? startOfDay(minDate) : null;
  const minMonthStart = minDay ? new Date(minDay.getFullYear(), minDay.getMonth(), 1) : null;
  const viewMonthStart = new Date(viewYear, viewMonth, 1);
  const canGoPrev = !minMonthStart || viewMonthStart.getTime() > minMonthStart.getTime();

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
    if (delta < 0 && minMonthStart && next.getTime() < minMonthStart.getTime()) return;
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  }

  function pickDate(date) {
    if (isBeforeCalendarDay(date, minDay)) return;
    onChange(date);
  }

  return (
    <div
      ref={calendarRef}
      className={`ua-cp-launch-modal__calendar${className ? ` ${className}` : ""}`}
      style={style}
      role="dialog"
      aria-label="Pick a date"
    >
      <div className="ua-cp-launch-modal__calendar-head">
        <button
          type="button"
          className="ua-cp-launch-modal__calendar-nav"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span>{MONTH_FULL[viewMonth]}, {viewYear}</span>
        <button type="button" className="ua-cp-launch-modal__calendar-nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="ua-cp-launch-modal__calendar-grid">
        {CAL_DOW.map((label) => (
          <span key={label} className="ua-cp-launch-modal__calendar-dow">{label}</span>
        ))}
        {cells.map((cell, index) => {
          const { date, outside } = cell;
          const selected = isSameCalendarDay(date, value);
          const today = isSameCalendarDay(date, DEMO_TODAY);
          const disabled = isBeforeCalendarDay(date, minDay);
          return (
            <button
              key={`${date.toISOString()}-${index}`}
              type="button"
              disabled={disabled}
              className={`ua-cp-launch-modal__calendar-day${selected ? " ua-cp-launch-modal__calendar-day--selected" : ""}${today ? " ua-cp-launch-modal__calendar-day--today" : ""}${outside ? " ua-cp-launch-modal__calendar-day--outside" : ""}${disabled ? " ua-cp-launch-modal__calendar-day--disabled" : ""}`}
              onClick={() => pickDate(date)}
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
  const calendarRef = useRef(null);
  const [calendarPos, setCalendarPos] = useState(null);
  const upcomingDates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
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
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [laterOpen, setLaterOpen] = useState(false);
  const [duration, setDuration] = useState(
    Number(existingMeeting?.durationMinutes) || defaultDuration,
  );
  const [hold, setHold] = useState("24 hours");
  const [note, setNote] = useState(existingMeeting?.coachNote || "");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [clockFor, setClockFor] = useState(null);
  const [slotError, setSlotError] = useState("");
  const dateCount = uniqueDateCount(slots);
  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);
  const firstName = String(user?.name || "client").split(" ")[0];
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
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
  const draftStartAt = fromTime ? combineDateAndTime(activeDate, fromTime) : null;
  const canAddSlot = Boolean(
    draftStartAt
    && draftStartAt.getTime() > Date.now()
    && !isBeforeCalendarDay(activeDate, todayStart),
  );

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        if (clockFor) setClockFor(null);
        else onClose?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, clockFor]);

  useEffect(() => {
    function onPointerDown(event) {
      if (laterWrapRef.current?.contains(event.target)) return;
      if (calendarRef.current?.contains(event.target)) return;
      setLaterOpen(false);
    }
    if (laterOpen) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [laterOpen]);

  useEffect(() => {
    if (!laterOpen) {
      setCalendarPos(null);
      return undefined;
    }
    function updatePos() {
      const anchor = laterWrapRef.current;
      if (!anchor) return;
      setCalendarPos(placeCalendarPopover(anchor));
    }
    updatePos();
    window.addEventListener("resize", updatePos);
    document.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      document.removeEventListener("scroll", updatePos, true);
    };
  }, [laterOpen]);

  function selectPreset(id) {
    setDateMode("preset");
    setSelectedPreset(id);
    setLaterOpen(false);
    setSlotError("");
  }

  function selectLaterDate(date) {
    if (isBeforeCalendarDay(date, todayStart)) {
      setSlotError("Choose today or a future date");
      return;
    }
    setDateMode("later");
    setLaterDate(startOfDay(date));
    setLaterOpen(false);
    setSlotError("");
  }

  function buildSlotFromForm() {
    if (!fromTime) return null;
    const end = toTime || formatSlotEnd(fromTime, duration);
    const [startH, startM] = fromTime.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    if (![startH, startM, endH, endM].every(Number.isFinite)) return null;
    if (isBeforeCalendarDay(activeDate, todayStart)) return null;
    const startAt = new Date(activeDate);
    startAt.setHours(startH, startM, 0, 0);
    const endAt = new Date(activeDate);
    endAt.setHours(endH, endM, 0, 0);
    if (endAt.getTime() <= startAt.getTime()) return null;
    if (startAt.getTime() <= Date.now()) return null;
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
    if (isBeforeCalendarDay(activeDate, todayStart)) {
      setSlotError("Choose today or a future date");
      return;
    }
    const startAt = combineDateAndTime(activeDate, fromTime);
    if (startAt && startAt.getTime() <= Date.now()) {
      setSlotError("Choose a start time in the future");
      return;
    }
    const slot = buildSlotFromForm();
    if (!slot) {
      setSlotError(fromTime ? "End time must be after start time" : "Set a start time first");
      return;
    }
    setSlots((prev) => {
      if (prev.some((s) => s.key === slot.key)) return prev;
      return [...prev, slot];
    });
    setFromTime("");
    setToTime("");
    setSlotError("");
  }

  function removeSlot(key) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  function handleClockSet(time24, target) {
    if (target === "start") {
      const startAt = combineDateAndTime(activeDate, time24);
      if (startAt && startAt.getTime() <= Date.now()) {
        setFromTime("");
        setToTime("");
        setSlotError("Choose a start time in the future");
        setClockFor(null);
        return;
      }
      setFromTime(time24);
      setToTime(formatSlotEnd(time24, duration));
      setSlotError("");
    } else {
      const endAt = combineDateAndTime(activeDate, time24);
      const startAt = combineDateAndTime(activeDate, fromTime);
      if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
        setSlotError("End time must be after start time");
        setClockFor(null);
        return;
      }
      setToTime(time24);
      setSlotError("");
    }
    setClockFor(null);
  }

  function handleSend() {
    if (!slots.length) return;
    const now = Date.now();
    const futureSlots = slots.filter((s) => new Date(s.startAt).getTime() > now);
    if (!futureSlots.length) {
      setSlotError("All offered slots must be in the future");
      return;
    }
    if (futureSlots.length !== slots.length) {
      setSlots(futureSlots);
      setSlotError("Past slots were removed — offer a future time");
      return;
    }
    const prior = slotsFromMeeting(existingMeeting).filter((s) => new Date(s.startAt).getTime() > now);
    const merged = [...prior];
    for (const slot of futureSlots) {
      if (!merged.some((s) => s.key === slot.key || (s.startAt === slot.startAt && s.endAt === slot.endAt))) {
        merged.push(slot);
      }
    }
    onSend?.({ slots: merged, note, hold, duration, date: activeDate });
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
          <div className="ua-cp-launch-modal__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(94, 106, 210)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18v16H3z"></path><path d="M3 10h18"></path><path d="M8 3v4"></path><path d="M16 3v4"></path></svg></div>
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
                  className={`ua-cp-launch-modal__later${dateMode === "later" ? " ua-cp-launch-modal__later--active" : ""}${laterOpen ? " ua-cp-launch-modal__later--open" : ""}`}
                  onClick={() => {
                    setDateMode("later");
                    setLaterOpen((open) => !open);
                  }}
                >
                  <span className="ua-cp-launch-modal__later-copy">
                    <span className="ua-cp-launch-modal__later-label">Later</span>
                    <span className="ua-cp-launch-modal__later-date" style={{color:"rgb(94, 106, 210)"}}>{formatDdMmYyyy(laterDate)}</span>
                  </span>
                  <span className="ua-cp-launch-modal__later-icon">{CALENDAR_ICON}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="ua-cp-launch-modal__section">
            <div className="ua-cp-launch-modal__row-label ua-cp-launch-modal__row-label--stack">
              <span className="ua-cp-launch-modal__row-label-main">Slots to offer · {slotsDayLabel}</span>
              <span className="ua-cp-launch-modal__hint">
                {fromTime
                  ? `Ends at ${formatClockLabel(toTime || formatSlotEnd(fromTime, duration))} · ${duration} min`
                  : "Set a start time — the end fills in from the duration"}
              </span>
            </div>
            <div className="ua-cp-launch-modal__slot-row ua-cp-launch-modal__slot-row--clock">
              <span className="ua-cp-launch-modal__slot-inline-label">From</span>
              <button
                type="button"
                className={`ua-cp-launch-modal__time-btn${clockFor === "start" ? " ua-cp-launch-modal__time-btn--active" : ""}${fromTime ? "" : " ua-cp-launch-modal__time-btn--empty"}`}
                onClick={() => {
                  setSlotError("");
                  setClockFor("start");
                }}
              >
                <span>{formatClockLabel(fromTime)}</span>
                {CLOCK_ICON}
              </button>
              <span className="ua-cp-launch-modal__slot-inline-label">to</span>
              <button
                type="button"
                className={`ua-cp-launch-modal__time-btn${clockFor === "end" ? " ua-cp-launch-modal__time-btn--active" : ""}${toTime ? "" : " ua-cp-launch-modal__time-btn--empty"}`}
                onClick={() => {
                  setSlotError("");
                  setClockFor("end");
                }}
              >
                <span>{formatClockLabel(toTime)}</span>
                {CLOCK_ICON}
              </button>
              <button
                type="button"
                className={`ua-cp-launch-modal__add-slot-btn${canAddSlot ? " ua-cp-launch-modal__add-slot-btn--on" : ""}`}
                disabled={!canAddSlot}
                onClick={addSlot}
              >
                + Add slot
              </button>
              <select
                className="ua-cp-launch-modal__duration-select"
                value={duration}
                title="Duration — sets the end time"
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setDuration(next);
                  if (fromTime) setToTime(formatSlotEnd(fromTime, next));
                }}
              >
                {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            {slotError ? (
              <p className="ua-cp-launch-modal__slot-error" role="alert">{slotError}</p>
            ) : null}
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
              If {firstName} does not pick a slot within {hold}, every held slot is released and your calendar frees up.
            </p>
          </div>

          <div className="ua-cp-launch-modal__section">
            <span className="ua-cp-launch-modal__label">Note for the client</span>
            <textarea
              className="ua-cp-launch-modal__note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={defaultNote || "Add a short note for the client"}
              rows={3}
            />
          </div>
        </div>

        <div className="ua-cp-launch-modal__foot">
          <span>
            {slots.length
              ? `${slots.length} slot${slots.length === 1 ? "" : "s"} held across ${dateCount} date${dateCount === 1 ? "" : "s"}`
              : "Nothing held yet"}
          </span>
          <div>
            <button type="button" className="ua-cp-btn ua-cp-btn--outline" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className={`ua-cp-btn ua-cp-btn--primary${slots.length ? "" : " ua-cp-btn--primary-disabled"}`}
              disabled={!slots.length}
              onClick={handleSend}
            >
              Send slot{slots.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>

      {clockFor ? (
        <AnalogClockPicker
          target={clockFor}
          initialTime={
            clockFor === "start"
              ? (fromTime || nextFutureClockTime(activeDate))
              : (toTime || fromTime || nextFutureClockTime(activeDate))
          }
          onCancel={() => setClockFor(null)}
          onSet={handleClockSet}
        />
      ) : null}
    </div>
  );

  const root = getModalRoot();
  const calendarRoot = getCalendarRoot();
  const calendar = laterOpen && calendarPos
    ? createPortal(
      <MiniCalendar
        calendarRef={calendarRef}
        className="ua-cp-launch-modal__calendar--popover"
        style={{ top: calendarPos.top, left: calendarPos.left, width: calendarPos.width }}
        value={laterDate}
        minDate={todayStart}
        onChange={selectLaterDate}
        onClear={() => {
          setLaterOpen(false);
          selectPreset("d0");
        }}
        onToday={() => selectLaterDate(new Date())}
      />,
      calendarRoot,
    )
    : null;

  return (
    <>
      {root ? createPortal(modal, root) : modal}
      {calendar}
    </>
  );
}
