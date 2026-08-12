import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";
import {
  CAL_BOOKED,
  CAL_CHANGES,
  CAL_DAYS,
  CAL_EVENTS,
  CAL_HELD,
  CAL_HOURS,
  CAL_LEGEND,
  CAL_WEEK_LABEL,
} from "../data/calendarData.js";

export function CalendarPage() {
  const { showToast: onToast } = useOutletContext();
  const [selectedDay, setSelectedDay] = useState(0);
  const day = CAL_DAYS[selectedDay] ?? CAL_DAYS[0];

  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="Calendar"
        subtitle="Confirmed sessions block your time. Slots you offer a client are held until they pick one — the rest are released automatically."
        actions={(
          <div className="ua-cal-header-legend">
            {CAL_LEGEND.map((l) => (
              <span key={l.label} className="ua-cal-header-legend__item">
                <i style={{ background: l.color }} /> {l.label}
              </span>
            ))}
          </div>
        )}
      />

      <div className="ua-cal-nav">
        <div className="ua-cal-nav__arrows">
          <button type="button" className="ua-cal-nav__arrow" title="Previous week" onClick={() => onToast("Previous week")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className="ua-cal-nav__arrow" title="Next week" onClick={() => onToast("Next week")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="ua-cal-nav__range">{CAL_WEEK_LABEL}</div>
        <button type="button" className="ua-cal-nav__today" onClick={() => onToast("Jumped to today")}>Today</button>
        <label className="ua-cal-nav__jump">
          Jump to
          <input type="date" defaultValue="2026-08-04" className="ua-cal-nav__date" />
        </label>
      </div>

      <div className="ua-cal-days-row">
        {CAL_DAYS.map((d, idx) => (
          <button
            key={d.num}
            type="button"
            className={`ua-cal-day-pill${selectedDay === idx ? " ua-cal-day-pill--active" : ""}`}
            onClick={() => setSelectedDay(idx)}
          >
            <span className="ua-cal-day-pill__dow">{d.dow}</span>
            <span className="ua-cal-day-pill__num">{d.num}</span>
            <span className="ua-cal-day-pill__tag">{d.tag}</span>
          </button>
        ))}
      </div>

      <div className="ua-cal-layout">
        <div className="ua-cal-main">
          <div className="ua-cal-day-toolbar">
            <div className="ua-section-label__title">{String(day.num).padStart(2, "0")} Aug 2026 · {day.today ? "today" : day.dow.toLowerCase()}</div>
            <div className="ua-cal-day-toolbar__right">
              <div className="ua-mini-tabs">
                <button type="button" className="ua-mini-tabs__btn ua-mini-tabs__btn--active">Day</button>
                <button type="button" className="ua-mini-tabs__btn">Week</button>
              </div>
              <button type="button" className="ua-cal-full-btn" onClick={() => onToast("Full 24 h view")}>Full 24 h</button>
              <span className="ua-cal-drag-hint">Drag on the grid to block time</span>
            </div>
          </div>

          <div className="ua-cal-grid-card">
            <div className="ua-cal-grid-head">
              <div className="ua-cal-grid-head__spacer" />
              <div className="ua-cal-grid-head__day">
                <div className="ua-cal-grid-head__dow">{day.dow}</div>
                <div className="ua-cal-grid-head__num">{day.num}</div>
              </div>
            </div>
            <div className="ua-cal-grid-body">
              <div className="ua-cal-grid__hours">
                {CAL_HOURS.map((h) => (
                  <div key={h} className="ua-cal-grid__hour">{String(h).padStart(2, "0")}:00</div>
                ))}
              </div>
              <div className="ua-cal-grid__col">
                {CAL_HOURS.map((h) => (
                  <div key={h} className="ua-cal-grid__line" />
                ))}
                {CAL_EVENTS.map((ev) => (
                  <button
                    key={ev.label + ev.sub}
                    type="button"
                    className={`ua-cal-event ua-cal-event--${ev.type}`}
                    style={{ top: ev.top, height: ev.height }}
                    onClick={() => onToast(ev.label)}
                  >
                    <div className="ua-cal-event__label">{ev.label}</div>
                    <div className="ua-cal-event__sub">{ev.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="ua-cal-side">
          <section className="ua-cal-panel">
            <div className="ua-cal-panel__head">
              <strong>Booked today</strong>
              <span className="ua-cal-panel__count">{CAL_BOOKED.length}</span>
            </div>
            {CAL_BOOKED.map((b) => (
              <div key={b.client} className="ua-cal-slot">
                <span className="ua-avatar ua-avatar--sm">{b.initial}</span>
                <div>
                  <div className="ua-cal-slot__name">{b.client}</div>
                  <div className="ua-cal-slot__meta">{b.meta}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="ua-cal-panel">
            <div className="ua-cal-panel__head">
              <strong>Held slots</strong>
              <span className="ua-cal-panel__count ua-cal-panel__count--held">{CAL_HELD.length}</span>
            </div>
            {CAL_HELD.map((h) => (
              <div key={h.client} className="ua-cal-held">
                <div className="ua-cal-slot">
                  <span className="ua-avatar ua-avatar--sm">{h.initial}</span>
                  <div>
                    <div className="ua-cal-slot__name">{h.client}</div>
                    <div className="ua-cal-slot__meta">{h.meta}</div>
                  </div>
                </div>
                <div className="ua-cal-held__slots">
                  {h.slots.map((slot) => (
                    <button key={slot} type="button" className="ua-cal-held__slot" onClick={() => onToast(`Confirm ${slot} for ${h.client}`)}>
                      {slot}
                    </button>
                  ))}
                </div>
                <div className="ua-cal-held__hint">{h.hint}</div>
              </div>
            ))}
          </section>

          <section className="ua-cal-panel">
            <div className="ua-cal-panel__head">
              <strong>Change requests</strong>
              <span className="ua-cal-panel__count ua-cal-panel__count--change">{CAL_CHANGES.length}</span>
            </div>
            {CAL_CHANGES.map((c) => (
              <div key={c.client} className="ua-cal-change">
                <div className="ua-cal-slot">
                  <span className="ua-avatar ua-avatar--sm">{c.initial}</span>
                  <div>
                    <div className="ua-cal-slot__name">{c.client}</div>
                    <div className="ua-cal-slot__meta">{c.meta}</div>
                  </div>
                </div>
                <p className="ua-cal-change__reason">{c.reason}</p>
                <div className="ua-cal-change__wants">
                  {c.wants.map((w) => (
                    <button key={w} type="button" className="ua-cal-change__want" onClick={() => onToast(`Approved ${w}`)}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
