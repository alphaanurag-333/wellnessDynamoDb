import { useMemo, useState } from "react";
import {
  isBeforeCalendarDay,
  isSameCalendarDay,
  startOfDay,
} from "./meetingDateUtils.js";

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CAL_DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function MiniCalendar({ value, onChange, onClear, onToday, minDate = null, className = "", style, calendarRef }) {
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const minDay = minDate ? startOfDay(minDate) : null;
  const minMonthStart = minDay ? new Date(minDay.getFullYear(), minDay.getMonth(), 1) : null;
  const viewMonthStart = new Date(viewYear, viewMonth, 1);
  const canGoPrev = !minMonthStart || viewMonthStart.getTime() > minMonthStart.getTime();
  const today = useMemo(() => new Date(), []);

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
          const isToday = isSameCalendarDay(date, today);
          const disabled = isBeforeCalendarDay(date, minDay);
          return (
            <button
              key={`${date.toISOString()}-${index}`}
              type="button"
              disabled={disabled}
              className={`ua-cp-launch-modal__calendar-day${selected ? " ua-cp-launch-modal__calendar-day--selected" : ""}${isToday ? " ua-cp-launch-modal__calendar-day--today" : ""}${outside ? " ua-cp-launch-modal__calendar-day--outside" : ""}${disabled ? " ua-cp-launch-modal__calendar-day--disabled" : ""}`}
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
