import { useEffect, useMemo, useRef, useState } from "react";
import {
  FOOD_DEMO_TODAY,
  formatFoodDateInput,
  formatFoodDateLabel,
  formatWaterRangeLabel,
  parseFoodDateInput,
} from "../../data/foodData.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function FoodDateRow({ selectedDate, onDateChange, onToday }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const label = formatFoodDateLabel(selectedDate);

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

function FoodDateCalendar({ value, onSelect, onClose }) {
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
        <button type="button" className="ua-cp-food-date-cal__nav" onClick={() => {
          if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
          else setViewMonth((m) => m + 1);
        }}
        >
          ›
        </button>
      </div>
      <div className="ua-cp-food-date-cal__grid">
        {DOW.map((d) => <span key={d} className="ua-cp-food-date-cal__dow">{d}</span>)}
        {cells.map((date, index) => {
          if (!date) return <span key={`pad-${index}`} className="ua-cp-food-date-cal__day ua-cp-food-date-cal__day--empty" />;
          const selected = date.toDateString() === value.toDateString();
          const today = date.toDateString() === FOOD_DEMO_TODAY.toDateString();
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={`ua-cp-food-date-cal__day${selected ? " ua-cp-food-date-cal__day--selected" : ""}${today ? " ua-cp-food-date-cal__day--today" : ""}`}
              onClick={() => onSelect(date)}
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
          value={formatFoodDateInput(value)}
          onChange={(e) => {
            const next = parseFoodDateInput(e.target.value);
            if (next) onSelect(next);
          }}
        />
        <button type="button" className="ua-cp-food-date-cal__close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function FoodWaterHistoryPicker({ range, onApply }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);
  const wrapRef = useRef(null);
  const label = formatWaterRangeLabel(range.from, range.to);

  useEffect(() => {
    setDraftFrom(range.from);
    setDraftTo(range.to);
  }, [range.from, range.to]);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function applyRange(from, to) {
    if (from > to) {
      onApply({ from: to, to: from });
    } else {
      onApply({ from, to });
    }
    setOpen(false);
  }

  function applyDraft() {
    applyRange(draftFrom, draftTo);
  }

  function setPreset(days) {
    const to = new Date(FOOD_DEMO_TODAY);
    const from = new Date(FOOD_DEMO_TODAY);
    from.setDate(from.getDate() - (days - 1));
    setDraftFrom(from);
    setDraftTo(to);
  }

  return (
    <div className="ua-cp-food-water-history-wrap" ref={wrapRef}>
      <button type="button" className="ua-cp-food-water-history" onClick={() => setOpen((o) => !o)}>
        <span className="ua-cp-food-water-history__icon" aria-hidden="true">📅</span>
        <span className="ua-cp-food-water-history__text">{label}</span>
        <span className="ua-cp-food-water-history__suffix">· History</span>
      </button>
      {open ? (
        <div className="ua-cp-food-water-range" role="dialog" aria-label="Select water history range">
          <div className="ua-cp-food-water-range__head">
            <strong>Select date range</strong>
            <button type="button" className="ua-cp-food-water-range__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="ua-cp-food-water-range__presets">
            {[
              { id: 7, label: "Last 7 days" },
              { id: 14, label: "Last 14 days" },
              { id: 30, label: "Last 30 days" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="ua-cp-food-water-range__preset"
                onClick={() => setPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="ua-cp-food-water-range__fields">
            <label className="ua-cp-food-water-range__field">
              <span>From</span>
              <input
                type="date"
                value={formatFoodDateInput(draftFrom)}
                onChange={(e) => {
                  const next = parseFoodDateInput(e.target.value);
                  if (next) setDraftFrom(next);
                }}
              />
            </label>
            <label className="ua-cp-food-water-range__field">
              <span>To</span>
              <input
                type="date"
                value={formatFoodDateInput(draftTo)}
                onChange={(e) => {
                  const next = parseFoodDateInput(e.target.value);
                  if (next) setDraftTo(next);
                }}
              />
            </label>
          </div>
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm ua-cp-food-water-range__apply" onClick={applyDraft}>
            Apply range
          </button>
        </div>
      ) : null}
    </div>
  );
}
