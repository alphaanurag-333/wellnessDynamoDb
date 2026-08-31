import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MiniCalendar } from "./MiniCalendar.jsx";
import {
  buildUpcomingDates,
  formatDateLabel,
  formatDdMmYyyy,
  getCalendarRoot,
  isBeforeCalendarDay,
  isSameCalendarDay,
  placeCalendarPopover,
  startOfDay,
} from "./meetingDateUtils.js";

const CALENDAR_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5h18v16H3z" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </svg>
);

function presetIdForDate(value, upcomingDates) {
  const match = upcomingDates.find((entry) => isSameCalendarDay(entry.date, value));
  return match?.id || null;
}

export function MeetingDateSelector({
  value,
  onChange,
  minDate,
  onInvalidDate,
  showLabel = true,
}) {
  const minDay = useMemo(() => startOfDay(minDate || new Date()), [minDate]);
  const selectedDate = useMemo(() => startOfDay(value || minDay), [value, minDay]);
  const upcomingDates = useMemo(() => buildUpcomingDates(minDay), [minDay]);
  const laterWrapRef = useRef(null);
  const calendarRef = useRef(null);
  const [calendarPos, setCalendarPos] = useState(null);
  const [dateMode, setDateMode] = useState(() => (presetIdForDate(selectedDate, buildUpcomingDates(minDay)) ? "preset" : "later"));
  const [selectedPreset, setSelectedPreset] = useState(() => presetIdForDate(selectedDate, buildUpcomingDates(minDay)) || "d0");
  const [laterDate, setLaterDate] = useState(selectedDate);
  const [laterOpen, setLaterOpen] = useState(false);

  useEffect(() => {
    const match = presetIdForDate(selectedDate, upcomingDates);
    if (match) {
      setDateMode("preset");
      setSelectedPreset(match);
    } else {
      setDateMode("later");
      setLaterDate(selectedDate);
    }
  }, [selectedDate, upcomingDates]);

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
    const entry = upcomingDates.find((row) => row.id === id) || upcomingDates[0];
    if (!entry) return;
    setDateMode("preset");
    setSelectedPreset(entry.id);
    setLaterOpen(false);
    onChange(startOfDay(entry.date));
  }

  function selectLaterDate(date) {
    if (isBeforeCalendarDay(date, minDay)) {
      onInvalidDate?.("Choose today or a future date");
      return;
    }
    const next = startOfDay(date);
    setDateMode("later");
    setLaterDate(next);
    setLaterOpen(false);
    onChange(next);
  }

  const calendar = laterOpen && calendarPos
    ? createPortal(
      <MiniCalendar
        calendarRef={calendarRef}
        className="ua-cp-launch-modal__calendar--popover"
        style={{ top: calendarPos.top, left: calendarPos.left, width: calendarPos.width }}
        value={laterDate}
        minDate={minDay}
        onChange={selectLaterDate}
        onClear={() => {
          setLaterOpen(false);
          selectPreset("d0");
        }}
        onToday={() => selectLaterDate(new Date())}
      />,
      getCalendarRoot(),
    )
    : null;

  return (
    <>
      {showLabel ? (
        <div className="ua-cp-launch-modal__row-label">
          <span className="ua-cp-launch-modal__row-label-main">Date</span>
          <span className="ua-cp-launch-modal__row-label-meta">{formatDateLabel(selectedDate)}</span>
        </div>
      ) : null}
      <div className="ua-cp-launch-modal__dates">
        {upcomingDates.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`ua-cp-launch-modal__date${dateMode === "preset" && selectedPreset === entry.id ? " ua-cp-launch-modal__date--active" : ""}`}
            onClick={() => selectPreset(entry.id)}
          >
            <span>{entry.day}</span>
            <strong>{entry.dateLabel}</strong>
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
              <span className="ua-cp-launch-modal__later-date" style={{ color: "rgb(94, 106, 210)" }}>
                {formatDdMmYyyy(laterDate)}
              </span>
            </span>
            <span className="ua-cp-launch-modal__later-icon">{CALENDAR_ICON}</span>
          </button>
        </div>
      </div>
      {calendar}
    </>
  );
}
