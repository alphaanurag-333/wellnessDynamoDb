import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { BlockTimeModal } from "../components/clientProfile/BlockTimeModal.jsx";
import { MiniCalendar, ScheduleMeetingModal } from "../components/clientProfile/ScheduleMeetingModal.jsx";
import { ReviewRequestedTimesModal } from "../components/clientProfile/ReviewRequestedTimesModal.jsx";
import {
  acceptOnboardingMeetingRequest,
  cancelOnboardingMeeting,
  createOnboardingMeetingSlots,
  fetchCalendarOnboardingMeetings,
  rejectOnboardingMeetingRequest,
} from "../api/onboardingApi.js";
import {
  CAL_HOUR_END,
  CAL_HOUR_PX,
  CAL_HOUR_START,
  CAL_LEGEND,
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

const STEP_LABELS = {
  launch: "LAUNCH",
  reportsBriefing: "Reports Briefing",
  hap: "HAP",
  programInitiation: "Program Initiation",
};

function initialsFromName(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

function padTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSlotLabel(startIso, endIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const end = endIso ? new Date(endIso) : null;
  const date = `${String(start.getDate()).padStart(2, "0")} ${start.toLocaleString("en-GB", { month: "short" })}`;
  const range = end && !Number.isNaN(end.getTime())
    ? `${padTime(start)}-${padTime(end)}`
    : padTime(start);
  return `${date} · ${range}`;
}

function releaseLabel(iso) {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "expired";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours} h ${mins} min`;
}

function mapCalendarMeetings(meetings) {
  const events = [];
  const confirmed = [];
  const offers = [];
  const changes = [];

  (meetings || []).forEach((meeting) => {
    if (!meeting || meeting.status === "cancelled" || meeting.status === "expired") return;
    const name = meeting.userName || meeting.userId || "Client";
    const kind = STEP_LABELS[meeting.stepKey] || meeting.stepKey;
    const slot = meeting.status === "confirmed"
      ? (
        (meeting.slots || []).find((s) => String(s.id) === String(meeting.selectedSlotId))
        || (meeting.confirmedStartAt && meeting.confirmedEndAt
          ? { startAt: meeting.confirmedStartAt, endAt: meeting.confirmedEndAt }
          : null)
        || meeting.slots?.[0]
      )
      : ((meeting.slots || []).find((s) => s.id === meeting.selectedSlotId) || meeting.slots?.[0]);
    const requestedSlots = Array.isArray(meeting.requestedSlots) && meeting.requestedSlots.length
      ? meeting.requestedSlots
      : (meeting.requestedStartAt && meeting.requestedEndAt
        ? [{ id: "legacy", startAt: meeting.requestedStartAt, endAt: meeting.requestedEndAt }]
        : []);

    if (meeting.status === "time_requested") {
      requestedSlots.forEach((reqSlot, index) => {
        const startIso = reqSlot.startAt;
        const endIso = reqSlot.endAt;
        if (!startIso) return;
        const start = new Date(startIso);
        const end = endIso ? new Date(endIso) : start;
        events.push({
          id: `${meeting.id}:${reqSlot.id || index}`,
          date: ymd(start),
          start: padTime(start),
          end: padTime(end),
          label: `${name} · ${kind}`,
          type: "blocked",
          canDelete: false,
          status: meeting.status,
        });
      });
    } else {
      const startIso = slot?.startAt;
      const endIso = slot?.endAt;
      if (startIso) {
        const start = new Date(startIso);
        const end = endIso ? new Date(endIso) : start;
        events.push({
          id: meeting.id,
          date: ymd(start),
          start: padTime(start),
          end: padTime(end),
          label: `${name} · ${kind}`,
          type: meeting.status === "confirmed" ? "confirmed" : "held",
          canDelete: false,
          status: meeting.status,
        });
      }
    }

    const firstRequested = requestedSlots[0];
    const startIso = meeting.status === "time_requested" ? firstRequested?.startAt : slot?.startAt;
    const endIso = meeting.status === "time_requested" ? firstRequested?.endAt : slot?.endAt;
    const row = {
      id: meeting.id,
      userId: meeting.userId,
      stepKey: meeting.stepKey,
      name,
      initial: initialsFromName(name),
      kind,
      duration: `${meeting.durationMinutes || 45} min`,
      mode: "Video call",
      date: startIso ? formatSlotLabel(startIso, endIso) : "—",
      time: startIso ? padTime(new Date(startIso)) : "—",
      release: releaseLabel(meeting.holdExpiresAt),
      slots: (meeting.slots || []).map((s) => formatSlotLabel(s.startAt, s.endAt)).filter(Boolean),
      wants: requestedSlots.map((s) => ({
        id: s.id,
        label: formatSlotLabel(s.startAt, s.endAt),
      })).filter((s) => s.label),
      meta: `${kind} · ${meeting.status.replace("_", " ")}`,
      reason: meeting.coachNote
        || (requestedSlots.length > 1
          ? `Client requested ${requestedSlots.length} times`
          : "Client requested another time"),
      meeting,
    };

    if (meeting.status === "confirmed") confirmed.push(row);
    if (meeting.status === "slots_offered") offers.push(row);
    if (meeting.status === "time_requested") changes.push(row);
  });

  return { events, confirmed, offers, changes };
}

export function CalendarPage() {
  const { showToast: onToast } = useOutletContext();
  const { can } = useViewAs();
  const canBlockTime =
    can("console.avail.create") || can("console.avail.edit") || can("console.avail.delete");
  const canManageMeetings =
    can("console.cal.create") || can("console.cal.edit") || can("console.cal.delete");
  const jumpRef = useRef(null);
  const gridColRef = useRef(null);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [weekStart, setWeekStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [view, setView] = useState("day");
  const [fullDay, setFullDay] = useState(false);
  const [events, setEvents] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [offers, setOffers] = useState([]);
  const [changes, setChanges] = useState([]);
  const [awaitingOpen, setAwaitingOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [drag, setDrag] = useState(null);
  const [blockDraft, setBlockDraft] = useState(null);

  const loadMeetings = () => {
    fetchCalendarOnboardingMeetings()
      .then((meetings) => {
        const mapped = mapCalendarMeetings(meetings);
        setEvents(mapped.events);
        setConfirmed(mapped.confirmed);
        setOffers(mapped.offers);
        setChanges(mapped.changes);
      })
      .catch((err) => onToast?.(err?.message || "Failed to load meetings"));
  };

  useEffect(() => {
    loadMeetings();
  }, []);

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
  const showNow = sameDay(selectedDate, today);
  const now = new Date();
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) - hourStart * 60) / 60 * hourPx;

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
    setWeekStart(today);
    setSelectedDate(today);
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
    if (!canBlockTime || entry.type !== "blocked") return;
    if (date) setSelectedDate(date);
    setBlockDraft({
      id: entry.id,
      start: entry.start,
      length: nearestLength(eventDurationMin(entry.start, entry.end)),
      label: entry.label,
    });
  }

  function onGridMouseDown(event) {
    if (!canBlockTime || event.button !== 0 || event.target.closest(".ua-cal-event")) return;
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

      <div className="ua-cal-days-scroll">
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
      </div>

      <div className="ua-cal-layout">
        <div className="ua-cal-main">
          <div className="ua-cal-day-toolbar">
            <div className="ua-section-label__title">
              {String(selectedDate.getDate()).padStart(2, "0")} {selectedDate.toLocaleString("en-GB", { month: "short" }).toUpperCase()} {selectedDate.getFullYear()}
              {sameDay(selectedDate, today) ? " · TODAY" : ""}
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
                        onClick={() => { if (!entry.preview && canBlockTime) openBlock(entry); }}
                      >
                        <div className="ua-cal-event__label">
                          {short && entry.type === "blocked" ? `${entry.start}–${entry.end} ${entry.label}` : entry.label}
                        </div>
                        {short ? null : <div className="ua-cal-event__sub">{entry.start}–{entry.end}</div>}
                        {entry.canDelete && can("console.avail.delete") ? (
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
                {canManageMeetings ? (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                    onClick={async () => {
                      try {
                        await cancelOnboardingMeeting(entry.userId, entry.id);
                        onToast(`${entry.name} cancelled`);
                        loadMeetings();
                      } catch (err) {
                        onToast(err?.message || "Failed to cancel");
                      }
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
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
                  <span key={slot} className="ua-cal-held__slot">{slot}</span>
                ))}
              </div>
              <div className="ua-cal-offer__hint">Only {entry.name.split(" ")[0]} can confirm these slots</div>
              <div className="ua-cal-offer__actions">
                {canManageMeetings ? (
                  <>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setScheduleFor({ ...entry, kind: "offer" })}>Offer more</button>
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                      onClick={async () => {
                        try {
                          await cancelOnboardingMeeting(entry.userId, entry.id);
                          onToast("Offer released");
                          loadMeetings();
                        } catch (err) {
                          onToast(err?.message || "Failed to release offer");
                        }
                      }}
                    >
                      Release all
                    </button>
                  </>
                ) : null}
              </div>
            </section>
          ))}

          <button type="button" className="ua-cal-collapse" onClick={() => setAwaitingOpen((open) => !open)}>
            Awaiting confirmation · {offers.length}
          </button>
          {awaitingOpen ? (offers.length ? offers.map((entry) => (
            <div key={`await-${entry.id}`} className="ua-cal-panel">
              <div className="ua-cal-slot">
                <span className="ua-avatar ua-avatar--sm">{entry.initial}</span>
                <div>
                  <div className="ua-cal-slot__name">{entry.name}</div>
                  <div className="ua-cal-slot__meta">{entry.meta}</div>
                </div>
              </div>
            </div>
          )) : <div className="ua-cal-empty">No held slots</div>) : null}

          <button type="button" className="ua-cal-collapse" onClick={() => setChangesOpen((open) => !open)}>
            Change requests · {changes.length}
          </button>
          {changesOpen ? (changes.length ? changes.map((entry) => (
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
                  <span key={slot.id || slot.label} className="ua-cal-change__want">
                    {slot.label || slot}
                  </span>
                ))}
              </div>
              <div className="ua-cal-offer__actions">
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  onClick={() => {
                    setReviewRequest({
                      userId: entry.userId,
                      meetingId: entry.id,
                      userName: entry.name,
                      stepLabel: entry.kind,
                      slots: (entry.meeting?.requestedSlots?.length
                        ? entry.meeting.requestedSlots
                        : entry.wants.map((w) => ({
                          id: w.id,
                          startAt: entry.meeting?.requestedStartAt,
                          endAt: entry.meeting?.requestedEndAt,
                          label: w.label,
                        }))).map((slot, index) => ({
                        id: slot.id || entry.wants[index]?.id || `slot-${index}`,
                        startAt: slot.startAt,
                        endAt: slot.endAt,
                      })),
                    });
                  }}
                >
                  {entry.wants.length > 1 ? "Review times" : "Accept"}
                </button>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                  onClick={async () => {
                    try {
                      await rejectOnboardingMeetingRequest(entry.userId, entry.id);
                      onToast("Request rejected. Existing slots remain.");
                      loadMeetings();
                    } catch (err) {
                      onToast(err?.message || "Failed to reject request");
                    }
                  }}
                >
                  Reject
                </button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setScheduleFor({ ...entry, kind: "change" })}>Offer other slots</button>
              </div>
            </section>
          )) : <div className="ua-cal-empty">No change requests</div>) : null}
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
      {reviewRequest ? (
        <ReviewRequestedTimesModal
          userName={reviewRequest.userName}
          stepLabel={reviewRequest.stepLabel}
          slots={reviewRequest.slots}
          busy={reviewBusy}
          onClose={() => {
            if (!reviewBusy) setReviewRequest(null);
          }}
          onAccept={async (slot) => {
            try {
              setReviewBusy(true);
              await acceptOnboardingMeetingRequest(reviewRequest.userId, reviewRequest.meetingId, {
                requestedSlotId: slot.id,
                startAt: slot.startAt,
                endAt: slot.endAt,
              });
              onToast(`Accepted ${reviewRequest.userName}'s requested time`);
              setReviewRequest(null);
              loadMeetings();
            } catch (err) {
              onToast(err?.message || "Failed to accept request");
            } finally {
              setReviewBusy(false);
            }
          }}
          onReject={async () => {
            try {
              setReviewBusy(true);
              await rejectOnboardingMeetingRequest(reviewRequest.userId, reviewRequest.meetingId);
              onToast("Request rejected. Existing slots remain.");
              setReviewRequest(null);
              loadMeetings();
            } catch (err) {
              onToast(err?.message || "Failed to reject request");
            } finally {
              setReviewBusy(false);
            }
          }}
        />
      ) : null}
      {scheduleFor ? (
        <ScheduleMeetingModal
          user={{ name: scheduleFor.name }}
          title={`Schedule ${STEP_LABELS[scheduleFor.stepKey] || "meeting"}`}
          defaultNote={scheduleFor.kind === "change" ? "New slots after your change request" : (scheduleFor.meeting?.coachNote || "")}
          defaultDuration={scheduleFor.duration ? Number(String(scheduleFor.duration).replace(/\D/g, "")) || 45 : 45}
          existingMeeting={scheduleFor.meeting}
          onClose={() => setScheduleFor(null)}
          onSend={async (payload) => {
            try {
              await createOnboardingMeetingSlots(scheduleFor.userId, {
                stepKey: scheduleFor.stepKey,
                slots: (payload?.slots || []).map((s) => ({
                  startAt: s.startAt,
                  endAt: s.endAt,
                })),
                note: payload?.note || "",
                hold: payload?.hold || "24 hours",
                durationMinutes: payload?.duration,
              });
              onToast(`Slots sent to ${scheduleFor.name}`);
              setScheduleFor(null);
              loadMeetings();
            } catch (err) {
              onToast(err?.message || "Failed to send slots");
            }
          }}
        />
      ) : null}
    </main>
  );
}
