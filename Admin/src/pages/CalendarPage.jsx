import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";
import { BlockTimeModal } from "../components/clientProfile/BlockTimeModal.jsx";
import { MiniCalendar, ScheduleMeetingModal } from "../components/clientProfile/ScheduleMeetingModal.jsx";
import {
  CAL_AWAITING,
  CAL_CHANGES,
  CAL_CONFIRMED,
  CAL_DEFAULT_DATE,
  CAL_DEMO_TODAY,
  CAL_EVENTS,
  CAL_HOUR_END,
  CAL_HOUR_PX,
  CAL_HOUR_START,
  CAL_LEGEND,
  CAL_OFFERS,
  addDays,
  addMinutesToTime,
  dayTag,
  eventDurationMin,
  eventStyle,
  formatDdMmYyyy,
  formatWeekLabel,
  ymd,
} from "../data/calendarData.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hoursForView(fullDay) {
  const start = fullDay ? 0 : CAL_HOUR_START;
  const end = fullDay ? 24 : CAL_HOUR_END;
  return Array.from({ length: end - start }, (_, index) => start + index);
}

function sameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function toHHMM(total) {
  const clamped = Math.max(0, Math.min(24 * 60, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snap15(mins) {
  return Math.round(mins / 15) * 15;
}

function minsFromPointer(clientY, colEl, hourStart, hourPx) {
  const rect = colEl.getBoundingClientRect();
  const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
  return snap15(hourStart * 60 + (y / hourPx) * 60);
}

function nearestLength(mins) {
  const options = [15, 30, 45, 60, 90, 120];
  return options.reduce((best, value) => (Math.abs(value - mins) < Math.abs(best - mins) ? value : best), 15);
}

function formatBlockDate(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function CalendarPage() {
  const { showToast: onToast } = useOutletContext();
  const jumpRef = useRef(null);
  const gridColRef = useRef(null);
  const [weekStart, setWeekStart] = useState(CAL_DEFAULT_DATE);
  const [selectedDate, setSelectedDate] = useState(CAL_DEFAULT_DATE);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [view, setView] = useState("day");
  const [fullDay, setFullDay] = useState(false);
  const [events, setEvents] = useState(CAL_EVENTS);
  const [confirmed, setConfirmed] = useState(CAL_CONFIRMED);
  const [offers, setOffers] = useState(CAL_OFFERS);
  const [awaitingOpen, setAwaitingOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [drag, setDrag] = useState(null);
  const [blockDraft, setBlockDraft] = useState(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const hours = hoursForView(fullDay);
  const hourStart = hours[0];
  const hourPx = CAL_HOUR_PX;
  const selectedKey = ymd(selectedDate);
  const previewEnd = blockDraft ? addMinutesToTime(blockDraft.start, blockDraft.length) : null;
  const previewLabel = blockDraft?.label || "Blocked time";
  const dayEvents = events
    .filter((entry) => entry.date === selectedKey && entry.id !== blockDraft?.id)
    .concat(blockDraft ? [{
      id: blockDraft.id || "preview",
      date: selectedKey,
      start: blockDraft.start,
      end: previewEnd,
      label: previewLabel,
      type: "blocked",
      canDelete: Boolean(blockDraft.id),
      preview: !blockDraft.id,
    }] : []);
  const showNow = sameDay(selectedDate, CAL_DEFAULT_DATE) || sameDay(selectedDate, CAL_DEMO_TODAY);
  const nowTop = ((12 * 60 + 45) - hourStart * 60) / 60 * hourPx;

  useEffect(() => {
    function onPointerDown(event) {
      if (!jumpRef.current?.contains(event.target)) setJumpOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setJumpOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function goToday() {
    setWeekStart(CAL_DEMO_TODAY);
    setSelectedDate(CAL_DEMO_TODAY);
    setJumpOpen(false);
    onToast("Jumped to today");
  }

  function jumpTo(date) {
    setSelectedDate(date);
    setWeekStart(date);
    setJumpOpen(false);
  }

  function shiftWeek(delta) {
    setWeekStart((prev) => addDays(prev, delta));
    setSelectedDate((prev) => addDays(prev, delta));
  }

  function openBlock(entry, date) {
    if (entry.type !== "blocked") return;
    if (date) setSelectedDate(date);
    setBlockDraft({
      id: entry.id,
      start: entry.start,
      length: nearestLength(eventDurationMin(entry.start, entry.end)),
      label: entry.label,
    });
  }

  function onGridMouseDown(event) {
    if (event.button !== 0 || event.target.closest(".ua-cal-event")) return;
    const col = gridColRef.current;
    if (!col) return;
    const start = minsFromPointer(event.clientY, col, hourStart, hourPx);
    setDrag({ start, end: start + 30 });

    function onMove(moveEvent) {
      const current = minsFromPointer(moveEvent.clientY, col, hourStart, hourPx);
      setDrag({
        start: Math.min(start, current),
        end: Math.max(start, current, start + 15),
      });
    }

    function onUp(upEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const current = minsFromPointer(upEvent.clientY, col, hourStart, hourPx);
      const from = Math.min(start, current);
      const span = Math.max(current, start) - Math.min(current, start);
      setDrag(null);
      setBlockDraft({
        start: toHHMM(from),
        length: span < 15 ? 15 : nearestLength(Math.max(span, 15)),
      });
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <main className="content ua-page-enter ua-cal-page">
      <PageHeader
        title="Calendar"
        subtitle="Confirmed sessions block your time. Slots you offer a client are held until they pick one — the rest are released automatically."
        actions={(
          <div className="ua-cal-header-legend">
            {CAL_LEGEND.map((entry) => (
              <span key={entry.label} className="ua-cal-header-legend__item">
                <i style={{ background: entry.color }} /> {entry.label}
              </span>
            ))}
          </div>
        )}
      />

      <div className="ua-cal-nav">
        <div className="ua-cal-nav__arrows">
          <button type="button" className="ua-cal-nav__arrow" title="Previous week" onClick={() => shiftWeek(-7)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className="ua-cal-nav__arrow" title="Next week" onClick={() => shiftWeek(7)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="ua-cal-nav__range">{formatWeekLabel(weekStart)}</div>
        <button type="button" className="ua-cal-nav__today" onClick={goToday}>Today</button>
        <div className="ua-cal-nav__jump" ref={jumpRef}>
          Jump to
          <button type="button" className="ua-cal-nav__date" onClick={() => setJumpOpen((open) => !open)}>
            {formatDdMmYyyy(selectedDate)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </button>
          {jumpOpen ? (
            <MiniCalendar
              value={selectedDate}
              onChange={jumpTo}
              onClear={() => setJumpOpen(false)}
              onToday={goToday}
            />
          ) : null}
        </div>
      </div>

      <div className="ua-cal-days-row">
        {days.map((date) => {
          const key = ymd(date);
          const tag = dayTag(events.filter((entry) => entry.date === key));
          const active = sameDay(date, selectedDate);
          return (
            <button
              key={key}
              type="button"
              className={`ua-cal-day-pill${active ? " ua-cal-day-pill--active" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="ua-cal-day-pill__dow">{DOW[date.getDay()]}</span>
              <span className="ua-cal-day-pill__num">{String(date.getDate()).padStart(2, "0")}</span>
              <span className="ua-cal-day-pill__tag">{tag}</span>
            </button>
          );
        })}
      </div>

      <div className="ua-cal-layout">
        <div className="ua-cal-main">
          <div className="ua-cal-day-toolbar">
            <div className="ua-section-label__title">
              {String(selectedDate.getDate()).padStart(2, "0")} {selectedDate.toLocaleString("en-GB", { month: "short" }).toUpperCase()} {selectedDate.getFullYear()}
              {sameDay(selectedDate, CAL_DEMO_TODAY) ? " · TODAY" : ""}
            </div>
            <div className="ua-cal-day-toolbar__right">
              <div className="ua-mini-tabs">
                <button type="button" className={`ua-mini-tabs__btn${view === "day" ? " ua-mini-tabs__btn--active" : ""}`} onClick={() => setView("day")}>Day</button>
                <button type="button" className={`ua-mini-tabs__btn${view === "week" ? " ua-mini-tabs__btn--active" : ""}`} onClick={() => setView("week")}>Week</button>
              </div>
              <button type="button" className={`ua-cal-full-btn${fullDay ? " is-on" : ""}`} onClick={() => setFullDay((value) => !value)}>Full 24 h</button>
              <span className="ua-cal-drag-hint">Drag on the grid to block time</span>
              <span className="ua-cal-confirmed-chip">CONFIRMED · {confirmed.length}</span>
            </div>
          </div>

          <div className="ua-cal-grid-card">
            {view === "week" ? (
              <div className="ua-cal-week">
                <div className="ua-cal-week__hours">
                  {hours.map((hour) => (
                    <div key={hour} className="ua-cal-grid__hour" style={{ height: hourPx }}>{String(hour).padStart(2, "0")}:00</div>
                  ))}
                </div>
                {days.map((date) => {
                  const key = ymd(date);
                  return (
                    <div key={key} className="ua-cal-week__col">
                      <button type="button" className="ua-cal-week__head" onClick={() => { setSelectedDate(date); setView("day"); }}>
                        {DOW[date.getDay()]} {date.getDate()}
                      </button>
                      <div className="ua-cal-grid__col" style={{ height: hours.length * hourPx }}>
                        {hours.map((hour) => <div key={hour} className="ua-cal-grid__line" style={{ height: hourPx }} />)}
                        {events.filter((entry) => entry.date === key).map((entry) => (
                          <div
                            key={entry.id}
                            className={`ua-cal-event ua-cal-event--${entry.type}${eventDurationMin(entry.start, entry.end) <= 30 ? " ua-cal-event--short" : ""}`}
                            style={eventStyle(entry.start, entry.end, hourStart, hourPx)}
                            onClick={() => openBlock(entry, date)}
                          >
                            <div className="ua-cal-event__label">{entry.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ua-cal-grid-body">
                <div className="ua-cal-grid__hours">
                  {hours.map((hour) => (
                    <div key={hour} className="ua-cal-grid__hour" style={{ height: hourPx }}>{String(hour).padStart(2, "0")}:00</div>
                  ))}
                </div>
                <div
                  ref={gridColRef}
                  className="ua-cal-grid__col"
                  style={{ height: hours.length * hourPx }}
                  onMouseDown={onGridMouseDown}
                >
                  {hours.map((hour) => <div key={hour} className="ua-cal-grid__line" style={{ height: hourPx }} />)}
                  {showNow ? <div className="ua-cal-now" style={{ top: nowTop }} /> : null}
                  {drag ? (
                    <div
                      className="ua-cal-drag"
                      style={{
                        top: `${((drag.start - hourStart * 60) / 60) * hourPx}px`,
                        height: `${((drag.end - drag.start) / 60) * hourPx}px`,
                      }}
                    />
                  ) : null}
                  {dayEvents.map((entry) => {
                    const short = eventDurationMin(entry.start, entry.end) <= 30;
                    return (
                      <div
                        key={entry.id}
                        className={`ua-cal-event ua-cal-event--${entry.type}${short ? " ua-cal-event--short" : ""}`}
                        style={eventStyle(entry.start, entry.end, hourStart, hourPx)}
                        onClick={() => { if (!entry.preview) openBlock(entry); }}
                      >
                        <div className="ua-cal-event__label">
                          {short && entry.type === "blocked" ? `${entry.start}–${entry.end} ${entry.label}` : entry.label}
                        </div>
                        {short ? null : <div className="ua-cal-event__sub">{entry.start}–{entry.end}</div>}
                        {entry.canDelete ? (
                          <button
                            type="button"
                            className="ua-cal-event__x"
                            aria-label="Remove block"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              setEvents((prev) => prev.filter((row) => row.id !== entry.id));
                              onToast("Block removed");
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="ua-cal-side">
          <section className="ua-cal-panel">
            <div className="ua-cal-panel__head">
              <strong>Confirmed · {confirmed.length}</strong>
            </div>
            {confirmed.length ? confirmed.map((entry) => (
              <div key={entry.id} className="ua-cal-booked">
                <div className="ua-cal-slot">
                  <span className="ua-avatar ua-avatar--sm">{entry.initial}</span>
                  <div>
                    <div className="ua-cal-slot__name">{entry.name}</div>
                    <div className="ua-cal-slot__meta">{entry.date} at {entry.time}</div>
                    <div className="ua-cal-slot__meta">{entry.kind} · {entry.mode}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  onClick={() => {
                    setConfirmed((prev) => prev.filter((row) => row.id !== entry.id));
                    setEvents((prev) => prev.filter((row) => row.label !== entry.name));
                    onToast(`${entry.name} cancelled`);
                  }}
                >
                  Cancel
                </button>
              </div>
            )) : <div className="ua-cal-empty">Nothing confirmed yet</div>}
          </section>

          {offers.map((entry) => (
            <section key={entry.id} className="ua-cal-panel ua-cal-offer">
              <div className="ua-cal-slot">
                <span className="ua-avatar ua-avatar--sm">{entry.initial}</span>
                <div>
                  <div className="ua-cal-slot__name">{entry.name}</div>
                  <div className="ua-cal-slot__meta">{entry.kind} · {entry.duration} · {entry.mode}</div>
                  <div className="ua-cal-slot__meta">releases in {entry.release}</div>
                </div>
              </div>
              <div className="ua-cal-held__slots">
                {entry.slots.map((slot) => (
                  <span key={slot} className="ua-cal-held__slot">
                    {slot}
                    <button
                      type="button"
                      aria-label="Remove slot"
                      onClick={() => {
                        setOffers((prev) => prev.map((row) => (
                          row.id === entry.id ? { ...row, slots: row.slots.filter((item) => item !== slot) } : row
                        )));
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="ua-cal-offer__hint">Only {entry.name.split(" ")[0]} can confirm · remove any slot with ×</div>
              <div className="ua-cal-offer__actions">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setScheduleFor({ ...entry, kind: "offer" })}>Offer more</button>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                  onClick={() => {
                    setOffers((prev) => prev.filter((row) => row.id !== entry.id));
                    onToast("Offer released");
                  }}
                >
                  Release all
                </button>
              </div>
            </section>
          ))}

          <button type="button" className="ua-cal-collapse" onClick={() => setAwaitingOpen((open) => !open)}>
            Awaiting confirmation · {CAL_AWAITING.length}
          </button>
          {awaitingOpen ? CAL_AWAITING.map((entry) => (
            <div key={entry.id} className="ua-cal-panel">
              <div className="ua-cal-slot">
                <span className="ua-avatar ua-avatar--sm">{entry.initial}</span>
                <div>
                  <div className="ua-cal-slot__name">{entry.name}</div>
                  <div className="ua-cal-slot__meta">{entry.meta}</div>
                </div>
              </div>
            </div>
          )) : null}

          <button type="button" className="ua-cal-collapse" onClick={() => setChangesOpen((open) => !open)}>
            Change requests · {CAL_CHANGES.length}
          </button>
          {changesOpen ? CAL_CHANGES.map((entry) => (
            <section key={entry.id} className="ua-cal-panel">
              <div className="ua-cal-slot">
                <span className="ua-avatar ua-avatar--sm">{entry.initial}</span>
                <div>
                  <div className="ua-cal-slot__name">{entry.name}</div>
                  <div className="ua-cal-slot__meta">{entry.meta}</div>
                </div>
              </div>
              <p className="ua-cal-change__reason">{entry.reason}</p>
              <div className="ua-cal-change__wants">
                {entry.wants.map((slot) => (
                  <span key={slot} className="ua-cal-change__want">{slot}</span>
                ))}
              </div>
              <div className="ua-cal-offer__actions">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setScheduleFor({ ...entry, kind: "change" })}>Offer other slots</button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => onToast("Kept as is")}>Keep as is</button>
              </div>
            </section>
          )) : null}
        </aside>
      </div>

      {blockDraft ? (
        <BlockTimeModal
          dateLabel={formatBlockDate(selectedDate)}
          start={blockDraft.start}
          defaultLength={blockDraft.length}
          defaultWhat={blockDraft.label || ""}
          onClose={() => setBlockDraft(null)}
          onChange={({ label, length }) => {
            setBlockDraft((prev) => prev ? { ...prev, label, length } : prev);
          }}
          onBlock={({ label, length, start }) => {
            const patch = {
              start,
              end: addMinutesToTime(start, length),
              label: label || "Blocked time",
              type: "blocked",
              canDelete: true,
            };
            setEvents((prev) => (
              blockDraft.id
                ? prev.map((row) => (row.id === blockDraft.id ? { ...row, ...patch } : row))
                : [...prev, { ...patch, id: `ev-block-${Date.now()}`, date: selectedKey }]
            ));
            setBlockDraft(null);
            onToast(blockDraft.id ? "Block updated" : "Time blocked");
          }}
        />
      ) : null}
      {scheduleFor ? (
        <ScheduleMeetingModal
          user={{ name: scheduleFor.name }}
          title="Schedule LAUNCH meeting"
          defaultNote={scheduleFor.kind === "change" ? "New slots after your change request" : ""}
          defaultDuration={30}
          onClose={() => setScheduleFor(null)}
          onSend={(payload) => {
            const extra = (payload?.slots || []).map((slot) => `${slot.dateLabel} · ${slot.range}`);
            if (scheduleFor.kind === "offer" && extra.length) {
              setOffers((prev) => prev.map((row) => (
                row.id === scheduleFor.id ? { ...row, slots: [...row.slots, ...extra] } : row
              )));
            }
            onToast(`Slots sent to ${scheduleFor.name}`);
            setScheduleFor(null);
          }}
        />
      ) : null}
    </main>
  );
}
