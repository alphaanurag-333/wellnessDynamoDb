import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatFoodDateInput,
  formatFoodDateLabel,
  formatWaterRangeLabel,
  localToday,
  parseFoodDateInput,
} from "../../data/foodData.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function rangeSpanDays(from, to) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function HistoryIcon({ tone }) {
  if (tone === "heart") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    );
  }
  if (tone === "sleep") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function FoodDateRow({ selectedDate, onDateChange, onToday, today = localToday() }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const label = formatFoodDateLabel(selectedDate, today);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function pickDate(date) {
    onDateChange(date);
    setOpen(false);
  }

  return (
    <div className="ua-cp-food-date-row" ref={wrapRef}>
      <div className="ua-cp-food-date-pill-wrap">
        <button type="button" className="ua-cp-food-date-pill" onClick={() => setOpen((o) => !o)}>
          <span className="ua-cp-food-date-pill__icon" aria-hidden="true">📅</span>
          <span className="ua-cp-food-date-pill__text">{label}</span>
          <span className="ua-cp-food-date-pill__link">Change date</span>
        </button>
        {open ? (
          <FoodDateCalendar
            value={selectedDate}
            today={today}
            onSelect={pickDate}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
      <button
        type="button"
        className="ua-cp-food-date-today"
        onClick={() => { onToday(); setOpen(false); }}
      >
        Today
      </button>
    </div>
  );
}

function FoodDateCalendar({ value, today = localToday(), onSelect, onClose }) {
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const todayStart = useMemo(() => startOfDay(today), [today]);
  const canGoNextMonth = viewYear < todayStart.getFullYear()
    || (viewYear === todayStart.getFullYear() && viewMonth < todayStart.getMonth());

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

  return (
    <div className="ua-cp-food-date-cal" role="dialog" aria-label="Choose date">
      <div className="ua-cp-food-date-cal__head">
        <button type="button" className="ua-cp-food-date-cal__nav" onClick={() => {
          if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
          else setViewMonth((m) => m - 1);
        }}
        >
          ‹
        </button>
        <strong>{MONTH_NAMES[viewMonth]} {viewYear}</strong>
        <button
          type="button"
          className="ua-cp-food-date-cal__nav"
          disabled={!canGoNextMonth}
          onClick={() => {
            if (!canGoNextMonth) return;
            if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
            else setViewMonth((m) => m + 1);
          }}
        >
          ›
        </button>
      </div>
      <div className="ua-cp-food-date-cal__grid">
        {DOW.map((d, index) => <span key={`${d}-${index}`} className="ua-cp-food-date-cal__dow">{d}</span>)}
        {cells.map((date, index) => {
          if (!date) return <span key={`pad-${index}`} className="ua-cp-food-date-cal__day ua-cp-food-date-cal__day--empty" />;
          const selected = date.toDateString() === value.toDateString();
          const isToday = date.toDateString() === today.toDateString();
          const isFuture = date.getTime() > todayStart.getTime();
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isFuture}
              className={`ua-cp-food-date-cal__day${selected ? " ua-cp-food-date-cal__day--selected" : ""}${isToday ? " ua-cp-food-date-cal__day--today" : ""}${isFuture ? " ua-cp-food-date-cal__day--disabled" : ""}`}
              onClick={() => {
                if (isFuture) return;
                onSelect(date);
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="ua-cp-food-date-cal__foot">
        <input
          type="date"
          className="ua-cp-food-date-cal__input"
          max={formatFoodDateInput(today)}
          value={formatFoodDateInput(value)}
          onChange={(e) => {
            const next = parseFoodDateInput(e.target.value);
            if (!next) return;
            if (next.getTime() > todayStart.getTime()) return;
            onSelect(next);
          }}
        />
        <button type="button" className="ua-cp-food-date-cal__close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/**
 * History range picker — calendar UI with Jump to today + Apply.
 * Selecting a day sets the range end; span matches the current window (default 14 days).
 * tone: "teal" | "heart" | "sleep"
 */
export function FoodWaterHistoryPicker({
  range,
  onApply,
  onRangeChange,
  today = localToday(),
  tone = "teal",
}) {
  const commit = onRangeChange || onApply;
  const [open, setOpen] = useState(false);
  const [draftEnd, setDraftEnd] = useState(() => startOfDay(range.to));
  const [viewMonth, setViewMonth] = useState(range.to.getMonth());
  const [viewYear, setViewYear] = useState(range.to.getFullYear());
  const wrapRef = useRef(null);
  const label = formatWaterRangeLabel(range.from, range.to);
  const todayStart = useMemo(() => startOfDay(today), [today]);
  const spanDays = useMemo(() => rangeSpanDays(range.from, range.to), [range.from, range.to]);

  useEffect(() => {
    setDraftEnd(startOfDay(range.to));
    setViewMonth(range.to.getMonth());
    setViewYear(range.to.getFullYear());
  }, [range.from, range.to]);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const canGoNextMonth = viewYear < todayStart.getFullYear()
    || (viewYear === todayStart.getFullYear() && viewMonth < todayStart.getMonth());

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

  function clampEnd(date) {
    const next = startOfDay(date);
    return next.getTime() > todayStart.getTime() ? new Date(todayStart) : next;
  }

  function buildRange(endDate) {
    const to = clampEnd(endDate);
    const from = addDays(to, -spanDays);
    return { from, to };
  }

  function jumpToToday() {
    const end = new Date(todayStart);
    setDraftEnd(end);
    setViewMonth(end.getMonth());
    setViewYear(end.getFullYear());
  }

  function applyDraft() {
    if (!commit) return;
    commit(buildRange(draftEnd));
    setOpen(false);
  }

  return (
    <div className={`ua-cp-food-water-history-wrap ua-cp-hist--${tone}`} ref={wrapRef}>
      <button style={{border:"1px solid rgb(230, 235, 242)"}}
        type="button"
        className="ua-cp-food-water-history"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="ua-cp-food-water-history__icon"><HistoryIcon tone={tone} /></span>
        <span className="ua-cp-food-water-history__text">{label}</span>
        <span className="ua-cp-food-water-history__suffix">· History</span>
      </button>
      {open ? (
        <div className="ua-cp-hist-cal" role="dialog" aria-label="Select history end date">
          <div className="ua-cp-hist-cal__head">
            <button
              type="button"
              className="ua-cp-hist-cal__nav"
              aria-label="Previous month"
              onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                else setViewMonth((m) => m - 1);
              }}
            >
              ‹
            </button>
            <strong>{MONTH_NAMES[viewMonth]} {viewYear}</strong>
            <button
              type="button"
              className="ua-cp-hist-cal__nav"
              aria-label="Next month"
              disabled={!canGoNextMonth}
              onClick={() => {
                if (!canGoNextMonth) return;
                if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                else setViewMonth((m) => m + 1);
              }}
            >
              ›
            </button>
          </div>
          <div className="ua-cp-hist-cal__grid">
            {DOW.map((d, index) => (
              <span key={`${d}-${index}`} className="ua-cp-hist-cal__dow">{d}</span>
            ))}
            {cells.map((date, index) => {
              if (!date) {
                return <span key={`pad-${index}`} className="ua-cp-hist-cal__day ua-cp-hist-cal__day--empty" />;
              }
              const selected = date.toDateString() === draftEnd.toDateString();
              const isFuture = date.getTime() > todayStart.getTime();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={isFuture}
                  className={`ua-cp-hist-cal__day${selected ? " is-selected" : ""}${isFuture ? " is-disabled" : ""}`}
                  onClick={() => {
                    if (isFuture) return;
                    setDraftEnd(startOfDay(date));
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="ua-cp-hist-cal__foot">
            <button type="button" className="ua-cp-hist-cal__jump" onClick={jumpToToday}>
              Jump to today
            </button>
            <button type="button" className="ua-cp-hist-cal__apply" onClick={applyDraft}>
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
