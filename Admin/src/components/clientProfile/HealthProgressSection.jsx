import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BP_STATS,
  BP_WEEKLY,
  CONDITION_OPTIONS,
  CONDITION_PHOTOS,
  FATLOSS_JOURNEY,
  WEIGHT_PHOTOS,
  GLUCOSE_STATS,
  GLUCOSE_WEEKLY,
  HBA1C_TREND,
  HBA1C_TREND_DISPLAY,
  CONDITION_TRACKER,
  HEALTH_TRACKERS,
  TRACKING_FILTER_OPTIONS,
  MENSTRUAL_CYCLES,
  MENSTRUAL_NOTES,
  MENSTRUAL_SUMMARY,
  SIMPLE_TRACKER_STATS,
  THYROID_SUMMARY,
  TSH_TREND,
} from "../../data/healthProgressData.js";

function formatDisplayDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ChartPlot({ children }) {
  return (
    <div className="ua-cp-hptrack-chart-plot">
      <div className="ua-cp-hptrack-chart-scroll">
        <div className="ua-cp-hptrack-chart-scroll__inner">
          {children}
        </div>
      </div>
    </div>
  );
}

function FatLossJourneyChart({ dates, values, color = "#ec7a45" }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const heights = values.map((v) => Math.max(16, ((v - min) / range) * 68 + 16));

  const linePoints = heights
    .map((h, i) => {
      const x = ((i + 0.5) / values.length) * 100;
      const y = 100 - h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <ChartPlot>
      <div className="ua-cp-hptrack-fatloss-chart">
        <svg className="ua-cp-hptrack-fatloss-chart__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="ua-cp-hptrack-fatloss-chart__cols">
          {values.map((value, index) => (
            <div key={dates[index]} className="ua-cp-hptrack-fatloss-chart__col">
              <span className="ua-cp-hptrack-fatloss-chart__val" style={{ color }}>{value}</span>
              <div className="ua-cp-hptrack-fatloss-chart__bar-area">
                <span
                  className="ua-cp-hptrack-fatloss-chart__bar"
                  style={{
                    height: `${heights[index]}%`,
                    background: index === values.length - 1 ? color : `${color}40`,
                  }}
                />
                <span
                  className="ua-cp-hptrack-fatloss-chart__dot"
                  style={{
                    bottom: `calc(${heights[index]}% - 6px)`,
                    borderColor: color,
                    background: index === values.length - 1 ? color : "#fff",
                  }}
                />
              </div>
              <span className="ua-cp-hptrack-fatloss-chart__day">{dates[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartPlot>
  );
}

function TrendLineChart({ dates, values, color = "#d64545" }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const heights = values.map((v) => Math.max(18, ((v - min) / range) * 70 + 18));

  const linePoints = heights
    .map((h, i) => {
      const x = ((i + 0.5) / values.length) * 100;
      const y = 100 - h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <ChartPlot>
      <div className="ua-cp-hptrack-trend-line">
        <svg className="ua-cp-hptrack-trend-line__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="ua-cp-hptrack-trend-line__cols">
          {values.map((value, index) => (
            <div key={dates[index]} className="ua-cp-hptrack-trend-line__col">
              <span className="ua-cp-hptrack-trend-line__val" style={{ color }}>{value}</span>
              <div className="ua-cp-hptrack-trend-line__plot">
                <span
                  className="ua-cp-hptrack-trend-line__dot"
                  style={{
                    bottom: `calc(${heights[index]}% - 6px)`,
                    borderColor: color,
                    background: index === values.length - 1 ? color : "#fff",
                  }}
                />
              </div>
              <span className="ua-cp-hptrack-trend-line__day">{dates[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartPlot>
  );
}

function BarTrendChart({ dates, values, color = "#0d9488" }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const heights = values.map((v) => Math.max(16, ((v - min) / range) * 68 + 16));

  return (
    <ChartPlot>
      <div className="ua-cp-hptrack-bar-trend__cols">
        {values.map((value, index) => (
          <div key={dates[index]} className="ua-cp-hptrack-bar-trend__col">
            <span className="ua-cp-hptrack-bar-trend__val" style={{ color }}>{value}</span>
            <div className="ua-cp-hptrack-bar-trend__bar-wrap">
              <span
                className="ua-cp-hptrack-bar-trend__bar"
                style={{
                  height: `${heights[index]}%`,
                  background: index === values.length - 1 ? color : `${color}44`,
                }}
              />
            </div>
            <span className="ua-cp-hptrack-bar-trend__day">{dates[index]}</span>
          </div>
        ))}
      </div>
    </ChartPlot>
  );
}

function LineChart({ dates, values, color, accentClass }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="ua-cp-hptrack-line-chart">
      <div className="ua-cp-hptrack-line-chart__plot">
        {values.map((value, index) => (
          <div key={dates[index]} className="ua-cp-hptrack-line-chart__col">
            <span className="ua-cp-hptrack-line-chart__val" style={{ color }}>{value}</span>
            <div className="ua-cp-hptrack-line-chart__bar-wrap">
              <span
                className={`ua-cp-hptrack-line-chart__bar${index === values.length - 1 ? ` ua-cp-hptrack-line-chart__bar--${accentClass}` : ""}`}
                style={{
                  height: `${Math.max(14, ((value - min) / range) * 70 + 30)}%`,
                  background: index === values.length - 1 ? color : `${color}33`,
                }}
              />
            </div>
            <span className="ua-cp-hptrack-line-chart__day">{dates[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupedBarChart({ dates, series, colors }) {
  const max = Math.max(...series.flatMap((s) => s.values));

  return (
    <ChartPlot>
      <div className="ua-cp-hptrack-group-chart">
        {dates.map((date, index) => (
          <div key={date} className="ua-cp-hptrack-group-chart__col">
            <div className="ua-cp-hptrack-group-chart__vals">
              {series.map((s) => (
                <span key={s.key} style={{ color: colors[s.key] }}>{s.values[index]}</span>
              ))}
            </div>
            <div className="ua-cp-hptrack-group-chart__bars">
              {series.map((s) => (
                <span
                  key={s.key}
                  className="ua-cp-hptrack-group-chart__bar"
                  style={{
                    height: `${Math.max(14, (s.values[index] / max) * 100)}%`,
                    background: colors[s.key],
                  }}
                />
              ))}
            </div>
            <span className="ua-cp-hptrack-group-chart__day">{date}</span>
          </div>
        ))}
      </div>
    </ChartPlot>
  );
}

function StatCards({ stats, tone = "default", variant = "full" }) {
  return (
    <div className="ua-cp-hptrack-stats">
      {stats.map((stat) => (
        <div key={stat.label} className={`ua-cp-hptrack-stat ua-cp-hptrack-stat--${tone}`}>
          <span className="ua-cp-hptrack-stat__label">{stat.label}</span>
          <strong className="ua-cp-hptrack-stat__value">{stat.value}</strong>
          {stat.delta ? (
            <span
              className={`ua-cp-hptrack-stat__delta${
                stat.delta.includes("↓") ? " ua-cp-hptrack-stat__delta--down" : stat.delta.includes("↑") ? " ua-cp-hptrack-stat__delta--up" : ""
              }`}
            >
              {stat.delta}
            </span>
          ) : null}
          {variant === "full" && stat.latest ? (
            <span className="ua-cp-hptrack-stat__latest">Latest · {stat.latest}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TrackerSectionHeader({ tracker }) {
  return (
    <div className="ua-cp-hptrack-section-head" id={`hp-tracker-${tracker.id}`}>
      <span className="ua-cp-hptrack-section-head__dot" style={{ background: tracker.color }} />
      <h3>{tracker.name}</h3>
    </div>
  );
}

function WeightPhotoCard({ photo, onApprove, onReject, onSave }) {
  const approved = photo.status === "approved";
  const rejected = photo.status === "rejected";

  return (
    <div className="ua-cp-hptrack-weight-photo-card">
      <div className="ua-cp-hptrack-weight-photo-card__media">
        <span className={`ua-cp-hptrack-weight-photo-card__badge ua-cp-hptrack-weight-photo-card__badge--${photo.status}`}>
          {photo.status}
        </span>
        <span className="ua-cp-hptrack-weight-photo-card__camera" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
        <strong>{photo.weight} {photo.unit}</strong>
      </div>
      <div className="ua-cp-hptrack-weight-photo-card__meta">
        <span>{photo.date}</span>
        <button type="button" className="ua-cp-hptrack-weight-photo-card__save" onClick={onSave}>
          Save
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
      <div className="ua-cp-hptrack-weight-photo-card__actions">
        <button
          type="button"
          className={`ua-cp-hptrack-weight-photo-card__approve${approved ? " ua-cp-hptrack-weight-photo-card__approve--done" : ""}`}
          onClick={onApprove}
        >
          Approve
        </button>
        <button
          type="button"
          className={`ua-cp-hptrack-weight-photo-card__reject${rejected ? " ua-cp-hptrack-weight-photo-card__reject--done" : ""}`}
          onClick={onReject}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function WeightPhotoHistoryModal({ open, photos, onClose, onApprove, onReject, onSave }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-hptrack-weight-history-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="weight-history-title">
        <div className="ua-cp-hptrack-weight-history-modal__head">
          <div>
            <h3 id="weight-history-title">Weight photo history</h3>
            <p>Every weigh-in photo the client uploaded, newest first.</p>
          </div>
          <button type="button" className="ua-cp-hptrack-weight-history-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ua-cp-hptrack-weight-history-modal__grid">
          {photos.map((photo) => (
            <WeightPhotoCard
              key={photo.id}
              photo={photo}
              onApprove={() => onApprove(photo.id)}
              onReject={() => onReject(photo.id)}
              onSave={() => onSave?.(photo.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConditionPhotoCard({ photo, onApprove, onReject, onDownload, compact = false }) {
  const approved = photo.status === "approved";
  const rejected = photo.status === "rejected";

  return (
    <div className={`ua-cp-hptrack-photo-card${compact ? " ua-cp-hptrack-photo-card--compact" : ""}`}>
      <div className="ua-cp-hptrack-photo-card__media">
        <span className={`ua-cp-hptrack-photo-card__badge ua-cp-hptrack-photo-card__badge--${photo.status}`}>
          {photo.status}
        </span>
        <span className="ua-cp-hptrack-photo-card__camera" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
        <strong>{photo.date}</strong>
      </div>
      <div className="ua-cp-hptrack-photo-card__actions">
        <button
          type="button"
          className={`ua-cp-hptrack-photo-card__approve${approved ? " ua-cp-hptrack-photo-card__approve--done" : ""}`}
          onClick={onApprove}
        >
          Approve
        </button>
        <button
          type="button"
          className={`ua-cp-hptrack-photo-card__reject${rejected ? " ua-cp-hptrack-photo-card__reject--done" : ""}`}
          onClick={onReject}
        >
          Reject
        </button>
        <button type="button" className="ua-cp-hptrack-photo-card__download" onClick={onDownload} aria-label="Download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ConditionHistoryModal({ open, condition, photos, onClose, onApprove, onReject, onDownload }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-hptrack-history-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="condition-history-title">
        <div className="ua-cp-hptrack-history-modal__head">
          <div>
            <h3 id="condition-history-title">Condition photo history</h3>
            <p>{condition} · every uploaded date, newest first</p>
          </div>
          <button type="button" className="ua-cp-hptrack-history-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ua-cp-hptrack-history-modal__grid">
          {photos.map((photo) => (
            <ConditionPhotoCard
              key={photo.id}
              photo={photo}
              compact
              onApprove={() => onApprove(photo.id)}
              onReject={() => onReject(photo.id)}
              onDownload={() => onDownload?.(photo.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FatLossPanel({ onToast }) {
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState("2026-03-20");
  const [weight, setWeight] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [weightPhotos, setWeightPhotos] = useState(WEIGHT_PHOTOS);

  function setPhotoStatus(id, status) {
    setWeightPhotos((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
    onToast?.(`Photo ${status}`);
  }

  return (
    <>
      <div className="ua-cp-hptrack-weight-form">
        <button type="button" className="ua-cp-hptrack-weight-form__pics" onClick={() => setHistoryOpen(true)}>
          <span className="ua-cp-hptrack-weight-form__pics-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
          <strong>View weight pics</strong>
          <span>Tap to view history</span>
        </button>
        <div className="ua-cp-hptrack-weight-form__fields">
          <label className="ua-cp-hptrack-field">
            <span>Date</span>
            <div className="ua-cp-hptrack-date-field">
              <div className="ua-cp-hptrack-date-field__picker">
                <span className="ua-cp-hptrack-date-field__text">{formatDisplayDate(date)}</span>
                <input
                  type="date"
                  className="ua-cp-hptrack-date-field__input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Date"
                />
              </div>
              <button type="button" className="ua-cp-hptrack-date-field__camera" onClick={() => setHistoryOpen(true)} aria-label="View weight photos">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>
          </label>
          <label className="ua-cp-hptrack-field">
            <span>Weight</span>
            <div className="ua-cp-hptrack-weight-input">
              <input type="number" placeholder="--" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <div className="ua-cp-hptrack-unit-toggle">
                <button type="button" className={`ua-cp-hptrack-unit-toggle__btn${unit === "kg" ? " ua-cp-hptrack-unit-toggle__btn--active" : ""}`} onClick={() => setUnit("kg")}>kg</button>
                <button type="button" className={`ua-cp-hptrack-unit-toggle__btn${unit === "lbs" ? " ua-cp-hptrack-unit-toggle__btn--active" : ""}`} onClick={() => setUnit("lbs")}>lbs</button>
              </div>
            </div>
          </label>
          <button type="button" className="ua-cp-btn ua-cp-hptrack-submit" onClick={() => onToast?.("Weight submitted")}>Submit</button>
        </div>
      </div>

      <WeightPhotoHistoryModal
        open={historyOpen}
        photos={weightPhotos}
        onClose={() => setHistoryOpen(false)}
        onApprove={(id) => setPhotoStatus(id, "approved")}
        onReject={(id) => setPhotoStatus(id, "rejected")}
        onSave={() => onToast?.("Photo saved")}
      />

      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--orange">
        <div className="ua-cp-hptrack-chart-card__head ua-cp-hptrack-chart-card__head--blue">
          <strong>Client fatloss journey</strong>
          <select className="ua-cp-hptrack-select" defaultValue="all">
            <option value="all">All since onboarding</option>
            <option value="4w">Last 4 weeks</option>
          </select>
        </div>
        <FatLossJourneyChart dates={FATLOSS_JOURNEY.dates} values={FATLOSS_JOURNEY.values} />
      </div>

      <div className="ua-cp-hptrack-progress-summary">
        <strong>Awesome progress</strong>
        <div className="ua-cp-hptrack-progress-summary__row">
          <div>
            <span>{FATLOSS_JOURNEY.summary.startDate}</span>
            <div className="ua-cp-hptrack-progress-summary__pill ua-cp-hptrack-progress-summary__pill--start">{FATLOSS_JOURNEY.summary.startWeight} kg</div>
          </div>
          <div className="ua-cp-hptrack-progress-summary__change">
            <span>→</span>
            <strong>{FATLOSS_JOURNEY.summary.change} kg</strong>
          </div>
          <div>
            <span>{FATLOSS_JOURNEY.summary.endDate}</span>
            <div className="ua-cp-hptrack-progress-summary__pill ua-cp-hptrack-progress-summary__pill--end">{FATLOSS_JOURNEY.summary.endWeight} kg</div>
          </div>
        </div>
      </div>
    </>
  );
}

function GlucosePanel() {
  return (
    <div className="ua-cp-hptrack-glucose">
      <StatCards stats={GLUCOSE_STATS} tone="red" />
      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--red ua-cp-hptrack-glucose__charts">
        <div className="ua-cp-hptrack-glucose__section">
          <div className="ua-cp-hptrack-chart-card__head">
            <strong>HbA1c trend</strong>
            <span className="ua-cp-hptrack-chart-card__target">Target {HBA1C_TREND_DISPLAY.target}</span>
          </div>
          <TrendLineChart dates={HBA1C_TREND_DISPLAY.dates} values={HBA1C_TREND_DISPLAY.values} color="#d64545" />
        </div>
        <div className="ua-cp-hptrack-glucose__divider" aria-hidden="true" />
        <div className="ua-cp-hptrack-glucose__section">
          <div className="ua-cp-hptrack-chart-card__head">
            <strong>FBS &amp; PPBS · weekly</strong>
            <div className="ua-cp-hptrack-chart-card__legend">
              <select className="ua-cp-hptrack-select" defaultValue="4w">
                <option value="4w">Last 4 weeks</option>
                <option value="all">All since onboarding</option>
              </select>
              <span><i style={{ background: "#d64545" }} /> FBS</span>
              <span><i style={{ background: "#ec7a45" }} /> PPBS</span>
            </div>
          </div>
          <GroupedBarChart
            dates={GLUCOSE_WEEKLY.dates}
            series={[
              { key: "fbs", values: GLUCOSE_WEEKLY.fbs },
              { key: "ppbs", values: GLUCOSE_WEEKLY.ppbs },
            ]}
            colors={{ fbs: "#d64545", ppbs: "#ec7a45" }}
          />
        </div>
      </div>
    </div>
  );
}

function MenstrualPanel({ cycles, setCycles, notes, setNotes, coachCanEdit, setCoachCanEdit, onToast }) {
  const [dateInput, setDateInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  function logDate() {
    if (!coachCanEdit || !dateInput.trim()) return;
    setCycles((list) => [
      { id: `c-${Date.now()}`, date: dateInput, length: "—", flow: "Moderate", latest: true },
      ...list.map((c) => ({ ...c, latest: false })),
    ]);
    setDateInput("");
    onToast?.("Cycle date logged");
  }

  function addNote() {
    if (!coachCanEdit || !noteInput.trim()) return;
    setNotes((list) => [
      { id: `n-${Date.now()}`, author: "Admin", date: "22 Jul 2026", text: noteInput },
      ...list,
    ]);
    setNoteInput("");
    onToast?.("Note added");
  }

  return (
    <div className="ua-cp-hptrack-menstrual">
      <StatCards stats={MENSTRUAL_SUMMARY} tone="purple" variant="summary" />
      <div className="ua-cp-hptrack-card ua-cp-hptrack-card--purple">
        <div className="ua-cp-hptrack-card__head">
          <strong>Logged cycle dates</strong>
          <div className="ua-cp-hptrack-toggle-row">
            <span>Coach can edit</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--purple${coachCanEdit ? " ua-toggle--on" : ""}`}
              aria-pressed={coachCanEdit}
              onClick={() => setCoachCanEdit((v) => !v)}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
        <div className="ua-cp-hptrack-log-row">
          <input
            type="text"
            placeholder="e.g. 28 Jun 2026"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            disabled={!coachCanEdit}
          />
          <button type="button" className="ua-cp-btn ua-cp-hptrack-btn--purple ua-cp-btn--sm" disabled={!coachCanEdit} onClick={logDate}>Log date</button>
        </div>
        <div className="ua-cp-hptrack-cycle-table">
          <div className="ua-cp-hptrack-cycle-table__head">
            <div>Period start</div><div>Cycle length</div><div>Flow</div><div />
          </div>
          {cycles.map((row) => (
            <div key={row.id} className="ua-cp-hptrack-cycle-table__row">
              <div className="ua-cp-hptrack-cycle-table__start">
                {row.date}
                {row.latest ? <span className="ua-cp-hptrack-cycle-table__latest">Latest</span> : null}
              </div>
              <div>{row.length}</div>
              <div>{row.flow}</div>
              <button
                type="button"
                className="ua-cp-hptrack-cycle-table__remove"
                disabled={!coachCanEdit}
                onClick={() => setCycles((list) => list.filter((c) => c.id !== row.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="ua-cp-hptrack-card ua-cp-hptrack-card--purple">
        <strong className="ua-cp-hptrack-card__title">Coach comments &amp; history</strong>
        <div className="ua-cp-hptrack-log-row">
          <input
            type="text"
            placeholder="Add a note about this client's cycle…"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            disabled={!coachCanEdit}
          />
          <button type="button" className="ua-cp-btn ua-cp-hptrack-btn--purple ua-cp-btn--sm" disabled={!coachCanEdit} onClick={addNote}>Add note</button>
        </div>
        <div className="ua-cp-hptrack-notes">
          {notes.map((note) => (
            <div key={note.id} className="ua-cp-hptrack-note">
              <div className="ua-cp-hptrack-note__head">
                <strong>{note.author}</strong>
                <span>{note.date}</span>
                <button type="button" disabled={!coachCanEdit} onClick={() => setNotes((list) => list.filter((n) => n.id !== note.id))}>×</button>
              </div>
              <p>{note.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BpPanel() {
  return (
    <>
      <StatCards stats={BP_STATS} tone="amber" />
      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--amber">
        <div className="ua-cp-hptrack-chart-card__head">
          <strong>Systolic &amp; Diastolic · weekly</strong>
          <div className="ua-cp-hptrack-chart-card__legend">
            <select className="ua-cp-hptrack-select" defaultValue="all">
              <option value="all">All since onboarding</option>
            </select>
            <span><i style={{ background: "#ec7a45" }} /> Systolic</span>
            <span><i style={{ background: "#d4a017" }} /> Diastolic</span>
          </div>
        </div>
        <GroupedBarChart
          dates={BP_WEEKLY.dates}
          series={[
            { key: "sys", values: BP_WEEKLY.systolic },
            { key: "dia", values: BP_WEEKLY.diastolic },
          ]}
          colors={{ sys: "#ec7a45", dia: "#d4a017" }}
        />
      </div>
    </>
  );
}

function ThyroidPanel() {
  return (
    <>
      <div className="ua-cp-hptrack-stats ua-cp-hptrack-stats--single">
        <div className="ua-cp-hptrack-stat ua-cp-hptrack-stat--teal">
          <span className="ua-cp-hptrack-stat__label">{THYROID_SUMMARY.label}</span>
          <strong className="ua-cp-hptrack-stat__value">{THYROID_SUMMARY.value}</strong>
          <span className="ua-cp-hptrack-stat__delta">{THYROID_SUMMARY.delta}</span>
          <span className="ua-cp-hptrack-stat__latest">Latest · {THYROID_SUMMARY.latest}</span>
        </div>
      </div>
      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--teal">
        <div className="ua-cp-hptrack-chart-card__head">
          <strong>TSH trend · Target {THYROID_SUMMARY.target}</strong>
          <select className="ua-cp-hptrack-select" defaultValue="all">
            <option value="all">All since onboarding</option>
          </select>
        </div>
        <BarTrendChart dates={TSH_TREND.dates} values={TSH_TREND.values} color="#0d9488" />
      </div>
    </>
  );
}

function ConditionPanel({ photos, setPhotos, onToast }) {
  const [conditions, setConditions] = useState([...CONDITION_OPTIONS]);
  const [condition, setCondition] = useState(CONDITION_OPTIONS[0]);
  const [newCondition, setNewCondition] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const latest = photos.slice(0, 2).reverse();

  function setPhotoStatus(id, status) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
    onToast?.(`Photo ${status}`);
  }

  function addCondition() {
    const name = newCondition.trim();
    if (!name || conditions.includes(name)) return;
    setConditions((list) => [...list, name]);
    setCondition(name);
    setNewCondition("");
    onToast?.(`Added ${name}`);
  }

  function removeCondition() {
    if (conditions.length <= 1) {
      onToast?.("At least one condition is required");
      return;
    }
    const next = conditions.filter((c) => c !== condition);
    setConditions(next);
    setCondition(next[0]);
    onToast?.(`Removed ${condition}`);
  }

  return (
    <div className="ua-cp-hptrack-condition">
      <div className="ua-cp-hptrack-condition-bar">
        <div className="ua-cp-hptrack-condition-bar__left">
          <select className="ua-cp-hptrack-condition-bar__select" value={condition} onChange={(e) => setCondition(e.target.value)}>
            {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" className="ua-cp-hptrack-condition-bar__delete" onClick={removeCondition} aria-label={`Remove ${condition}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
        <div className="ua-cp-hptrack-condition-bar__right">
          <input
            type="text"
            className="ua-cp-hptrack-condition-bar__input"
            placeholder="Add a condition…"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCondition()}
          />
          <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" disabled={!newCondition.trim()} onClick={addCondition}>Add</button>
        </div>
      </div>

      <p className="ua-cp-hptrack-condition-hint">
        Compare the two most recent uploads for {condition}. Each photo can be approved, rejected or downloaded;
        {" "}
        <button type="button" className="ua-cp-hptrack-condition-hint__link" onClick={() => setHistoryOpen(true)}>open history</button>
        {" "}
        to compare any earlier dates.
      </p>

      <div className="ua-cp-hptrack-comparison">
        <div className="ua-cp-hptrack-comparison__head">
          <span>Latest comparison</span>
          <button type="button" className="ua-cp-hptrack-view-history" onClick={() => setHistoryOpen(true)}>View history</button>
        </div>
        <div className="ua-cp-hptrack-photo-grid">
          {latest.map((photo) => (
            <ConditionPhotoCard
              key={photo.id}
              photo={photo}
              onApprove={() => setPhotoStatus(photo.id, "approved")}
              onReject={() => setPhotoStatus(photo.id, "rejected")}
              onDownload={() => onToast?.("Download started")}
            />
          ))}
        </div>
      </div>

      <ConditionHistoryModal
        open={historyOpen}
        condition={condition}
        photos={photos}
        onClose={() => setHistoryOpen(false)}
        onApprove={(id) => setPhotoStatus(id, "approved")}
        onReject={(id) => setPhotoStatus(id, "rejected")}
        onDownload={() => onToast?.("Download started")}
      />
    </div>
  );
}

function SimpleTrackerPanel({ trackerId }) {
  const stats = SIMPLE_TRACKER_STATS[trackerId];
  if (!stats) return null;
  return <StatCards stats={stats} tone="default" />;
}

function TrackerDetail({ tracker, ...props }) {
  switch (tracker.id) {
    case "fatloss": return <FatLossPanel onToast={props.onToast} />;
    case "glucose": return <GlucosePanel />;
    case "menstrual": return <MenstrualPanel {...props} />;
    case "bp": return <BpPanel />;
    case "thyroid": return <ThyroidPanel />;
    case "condition": return <ConditionPanel {...props} />;
    default: return <SimpleTrackerPanel trackerId={tracker.id} />;
  }
}

export function HealthProgressSection({ user, onToast }) {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("program");
  const scrolled = useRef(false);

  const [trackers, setTrackers] = useState([...HEALTH_TRACKERS, CONDITION_TRACKER]);
  const [search, setSearch] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [cycles, setCycles] = useState(MENSTRUAL_CYCLES);
  const [notes, setNotes] = useState(MENSTRUAL_NOTES);
  const [coachCanEdit, setCoachCanEdit] = useState(true);
  const [photos, setPhotos] = useState(CONDITION_PHOTOS);

  const liveCount = trackers.filter((t) => t.enabled).length;

  const filteredTrackers = useMemo(() => {
    let list = trackers;
    if (trackingFilter !== "all") {
      list = list.filter((t) => t.id === trackingFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => `${t.name} ${t.category}`.toLowerCase().includes(q));
    }
    return list;
  }, [trackers, trackingFilter, search]);

  const enabledTrackers = trackers.filter((t) => t.enabled);
  const visibleDetailTrackers = useMemo(() => {
    if (trackingFilter === "all") return enabledTrackers;
    return enabledTrackers.filter((t) => t.id === trackingFilter);
  }, [enabledTrackers, trackingFilter]);

  useEffect(() => {
    if (trackingFilter === "all") return undefined;
    const el = document.getElementById(`hp-tracker-${trackingFilter}`);
    if (!el) return undefined;
    const timer = window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [trackingFilter]);

  useEffect(() => {
    const programMap = {
      "fat-loss": "fatloss",
      diabetes: "glucose",
      pcod: "menstrual",
      gut: "gut",
    };
    const mapped = programMap[focusId] || focusId;
    const target = mapped ? `hp-tracker-${mapped}` : null;
    if (!target || scrolled.current) return undefined;
    const el = document.getElementById(target);
    if (!el) return undefined;
    scrolled.current = true;
    const timer = window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [focusId]);

  function toggleTracker(id) {
    setTrackers((list) => list.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
    onToast?.("Tracker updated");
  }

  function removeTracker(id) {
    setTrackers((list) => list.filter((t) => t.id !== id));
    onToast?.("Tracker removed");
  }

  return (
    <div className="ua-cp-section ua-cp-hptrack">
      <div className="ua-cp-hptrack__head">
        <div>
          <h2 className="ua-cp-hptrack__title">Health Progress</h2>
          <p className="ua-cp-hptrack__sub">What this client is tracking. Enable a tracker to show it in their app.</p>
          <span className="ua-cp-hptrack__live">Trackers · {liveCount} of {trackers.length} live in app</span>
        </div>
        <label className="ua-cp-hptrack__filter">
          <span>Tracking</span>
          <select value={trackingFilter} onChange={(e) => setTrackingFilter(e.target.value)}>
            {TRACKING_FILTER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="ua-cp-hptrack-manager">
        <input
          type="search"
          className="ua-cp-hptrack-search"
          placeholder="Search trackers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ua-cp-hptrack-list">
          {filteredTrackers.map((tracker) => (
            <div key={tracker.id} className="ua-cp-hptrack-list__row">
              <span className="ua-cp-hptrack-list__dot" style={{ background: tracker.color }} />
              <div className="ua-cp-hptrack-list__copy">
                <strong>{tracker.name}</strong>
                <span> · {tracker.category}</span>
              </div>
              {tracker.enabled ? <span className="ua-cp-hptrack-list__status">Live in app</span> : null}
              <button
                type="button"
                className={`ua-toggle${tracker.enabled ? " ua-toggle--on" : ""}`}
                aria-pressed={tracker.enabled}
                onClick={() => toggleTracker(tracker.id)}
              >
                <span className="ua-toggle__knob" />
              </button>
              <button type="button" className="ua-cp-hptrack-list__delete" onClick={() => removeTracker(tracker.id)} aria-label={`Remove ${tracker.name}`}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      <div className="ua-cp-hptrack-details">
        {visibleDetailTrackers.map((tracker) => (
          <section key={tracker.id} className="ua-cp-hptrack-detail">
            <TrackerSectionHeader tracker={tracker} />
            <TrackerDetail
              tracker={tracker}
              cycles={cycles}
              setCycles={setCycles}
              notes={notes}
              setNotes={setNotes}
              coachCanEdit={coachCanEdit}
              setCoachCanEdit={setCoachCanEdit}
              photos={photos}
              setPhotos={setPhotos}
              onToast={onToast}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
