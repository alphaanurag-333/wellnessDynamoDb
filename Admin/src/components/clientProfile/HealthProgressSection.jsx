import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchBloodPressureLogs,
  fetchConditionLogs,
  fetchGlucoseLogs,
  fetchHealthProgressSettings,
  fetchMenstrualCycleLogs,
  fetchWeightLogs,
  updateHealthProgressSettings,
} from "../../api/healthProgressApi.js";
import {
  CLIENT_HEALTH_TRACKERS,
  CLIENT_TRACKING_FILTER_OPTIONS,
} from "../../data/healthProgressData.js";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

const BODY_PART_LABELS = {
  face: "Face",
  skin: "Skin",
  belly: "Belly",
  arms: "Arms",
  legs: "Legs",
  back: "Back",
  full_body: "Full body",
  other: "Other",
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDisplayDate(value) {
  if (!value) return "—";
  const isoDate = String(value).length <= 10 ? `${value}T12:00:00` : value;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatChartDate(value) {
  if (!value) return "";
  const isoDate = String(value).length <= 10 ? `${value}T12:00:00` : value;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatSummaryDate(value) {
  if (!value) return "—";
  const isoDate = String(value).length <= 10 ? `${value}T12:00:00` : value;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(value);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

function sortByDateAsc(items, key = "recordedAt") {
  return [...items].sort((a, b) => new Date(a[key] || 0).getTime() - new Date(b[key] || 0).getTime());
}

function sortByDateDesc(items, key = "recordedAt") {
  return [...items].sort((a, b) => new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime());
}

function applyRange(logs, range, key = "recordedAt") {
  if (range !== "4w") return logs;
  const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
  return logs.filter((row) => new Date(row[key] || 0).getTime() >= cutoff);
}

function estimateHbA1cFromFbs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number(((n + 46.7) / 28.7).toFixed(1));
}

function deltaLabel(current, previous, unit = "") {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "";
  const diff = Number((current - previous).toFixed(1));
  if (diff === 0) return "No change";
  const arrow = diff < 0 ? "↓" : "↑";
  return `${arrow} ${Math.abs(diff)}${unit}`;
}

function bodyPartLabel(row) {
  const key = String(row?.bodyPart || "").toLowerCase();
  if (key === "other" && row?.bodyPartOther) return String(row.bodyPartOther);
  return BODY_PART_LABELS[key] || key || "Condition";
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

function EmptyLogs({ label }) {
  return <p className="ua-cp-hptrack-empty">No {label} logged yet.</p>;
}

function FatLossJourneyChart({ dates, values, color = "#ec7a45" }) {
  if (!values.length) return null;
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
            <div key={`${dates[index]}-${index}`} className="ua-cp-hptrack-fatloss-chart__col">
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
  if (!values.length) return null;
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
            <div key={`${dates[index]}-${index}`} className="ua-cp-hptrack-trend-line__col">
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

function GroupedBarChart({ dates, series, colors }) {
  if (!dates.length) return null;
  const nums = series.flatMap((s) => s.values.map((v) => Number(v)).filter(Number.isFinite));
  const max = Math.max(1, ...nums);

  return (
    <ChartPlot>
      <div className="ua-cp-hptrack-group-chart">
        {dates.map((date, index) => (
          <div key={`${date}-${index}`} className="ua-cp-hptrack-group-chart__col">
            <div className="ua-cp-hptrack-group-chart__vals">
              {series.map((s) => {
                const n = Number(s.values[index]);
                return (
                  <span key={s.key} style={{ color: colors[s.key] }}>
                    {Number.isFinite(n) ? n : "—"}
                  </span>
                );
              })}
            </div>
            <div className="ua-cp-hptrack-group-chart__bars">
              {series.map((s) => {
                const n = Number(s.values[index]);
                return (
                  <span
                    key={s.key}
                    className="ua-cp-hptrack-group-chart__bar"
                    style={{
                      height: Number.isFinite(n) ? `${Math.max(14, (n / max) * 100)}%` : "0%",
                      background: colors[s.key],
                    }}
                  />
                );
              })}
            </div>
            <span className="ua-cp-hptrack-group-chart__day">{date}</span>
          </div>
        ))}
      </div>
    </ChartPlot>
  );
}

function StatCards({ stats, tone = "default", variant = "full" }) {
  if (!stats?.length) return null;
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

function WeightPhotoCard({ photo }) {
  const openPhoto = () => {
    if (photo.url && photo.url !== "mock") window.open(photo.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="ua-cp-hptrack-weight-photo-card">
      <div className="ua-cp-hptrack-weight-photo-card__media">
        {photo.url && photo.url !== "mock" ? (
          <img className="ua-cp-hptrack-weight-photo-card__img" src={photo.url} alt={`${photo.weight} kg`} />
        ) : (
          <span className="ua-cp-hptrack-weight-photo-card__camera" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        )}
        <strong>{photo.weight} {photo.unit}</strong>
      </div>
      <div className="ua-cp-hptrack-weight-photo-card__meta">
        <span>{photo.date}</span>
        {photo.url && photo.url !== "mock" ? (
          <button type="button" className="ua-cp-hptrack-weight-photo-card__save" onClick={openPhoto}>
            Open
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WeightPhotoHistoryModal({ open, photos, onClose }) {
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
          {photos.length ? photos.map((photo) => (
            <WeightPhotoCard key={photo.id} photo={photo} />
          )) : <EmptyLogs label="weight photos" />}
        </div>
      </div>
    </div>
  );
}

function ConditionPhotoCard({ photo, label }) {
  const openPhoto = () => {
    if (photo.url) window.open(photo.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="ua-cp-hptrack-photo-card">
      {label ? <span className="ua-cp-hptrack-photo-card__label">{label}</span> : null}
      <div
        className="ua-cp-hptrack-photo-card__media"
        role={photo.url ? "button" : undefined}
        tabIndex={photo.url ? 0 : undefined}
        onClick={photo.url ? openPhoto : undefined}
        onKeyDown={photo.url ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPhoto();
          }
        } : undefined}
      >
        {photo.url ? (
          <img className="ua-cp-hptrack-photo-card__img" src={photo.url} alt={photo.date} />
        ) : (
          <span className="ua-cp-hptrack-photo-card__camera" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        )}
        <strong>{photo.date}</strong>
      </div>
      <div className="ua-cp-hptrack-photo-card__actions ua-cp-hptrack-photo-card__actions--view">
        <button type="button" className="ua-cp-hptrack-photo-card__open" onClick={openPhoto} disabled={!photo.url}>
          {photo.url ? "Open photo" : "No photo"}
        </button>
      </div>
    </article>
  );
}

function ConditionEmptySlot({ label }) {
  return (
    <article className="ua-cp-hptrack-photo-card ua-cp-hptrack-photo-card--empty">
      {label ? <span className="ua-cp-hptrack-photo-card__label">{label}</span> : null}
      <div className="ua-cp-hptrack-photo-card__media">
        <span className="ua-cp-hptrack-photo-card__camera" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </div>
      <p className="ua-cp-hptrack-photo-card__empty-copy">No earlier photo yet</p>
    </article>
  );
}

function ConditionHistoryModal({ open, condition, photos, onClose }) {
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
          {photos.length ? photos.map((photo) => (
            <ConditionPhotoCard key={photo.id} photo={photo} />
          )) : <EmptyLogs label="photos" />}
        </div>
      </div>
    </div>
  );
}

function FatLossPanel({ logs }) {
  const [range, setRange] = useState("all");
  const [historyOpen, setHistoryOpen] = useState(false);

  const photos = useMemo(() => (
    sortByDateDesc(logs)
      .filter((row) => row.weightPicUrl)
      .map((row) => ({
        id: row.id || row._id,
        date: formatDisplayDate(row.recordedAt),
        weight: Number.isFinite(Number(row.weightKg)) ? Number(row.weightKg) : "—",
        unit: "kg",
        url: row.weightPicUrl,
      }))
  ), [logs]);

  const series = useMemo(() => {
    const filtered = applyRange(sortByDateAsc(logs), range).filter((row) => Number.isFinite(Number(row.weightKg)));
    const dates = filtered.map((row) => formatChartDate(row.recordedAt));
    const values = filtered.map((row) => Number(Number(row.weightKg).toFixed(1)));
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const startWeight = first ? Number(first.weightKg) : null;
    const endWeight = last ? Number(last.weightKg) : null;
    const change = Number.isFinite(startWeight) && Number.isFinite(endWeight)
      ? Number((endWeight - startWeight).toFixed(1))
      : null;
    return {
      dates,
      values,
      summary: first && last ? {
        startDate: formatSummaryDate(first.recordedAt),
        startWeight,
        endDate: formatSummaryDate(last.recordedAt),
        endWeight,
        change,
      } : null,
    };
  }, [logs, range]);

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
          <span>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : "No photos yet"}</span>
        </button>
      </div>

      <WeightPhotoHistoryModal
        open={historyOpen}
        photos={photos}
        onClose={() => setHistoryOpen(false)}
      />

      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--orange">
        <div className="ua-cp-hptrack-chart-card__head ua-cp-hptrack-chart-card__head--blue">
          <strong>Client fatloss journey</strong>
          <select className="ua-cp-hptrack-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="all">All since onboarding</option>
            <option value="4w">Last 4 weeks</option>
          </select>
        </div>
        {series.values.length ? (
          <FatLossJourneyChart dates={series.dates} values={series.values} />
        ) : (
          <EmptyLogs label="weight readings" />
        )}
      </div>

      {series.summary ? (
        <div className="ua-cp-hptrack-progress-summary">
          <strong>{series.summary.change < 0 ? "Awesome progress" : "Weight journey"}</strong>
          <div className="ua-cp-hptrack-progress-summary__row">
            <div>
              <span>{series.summary.startDate}</span>
              <div className="ua-cp-hptrack-progress-summary__pill ua-cp-hptrack-progress-summary__pill--start">{series.summary.startWeight} kg</div>
            </div>
            <div className="ua-cp-hptrack-progress-summary__change">
              <span>→</span>
              <strong>{series.summary.change > 0 ? "+" : ""}{series.summary.change} kg</strong>
            </div>
            <div>
              <span>{series.summary.endDate}</span>
              <div className="ua-cp-hptrack-progress-summary__pill ua-cp-hptrack-progress-summary__pill--end">{series.summary.endWeight} kg</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function GlucosePanel({ logs }) {
  const [range, setRange] = useState("all");

  const view = useMemo(() => {
    const filtered = applyRange(sortByDateAsc(logs), range);
    const fbs = filtered.filter((row) => row.type === "fbs" && Number.isFinite(Number(row.value)));
    const ppbs = filtered.filter((row) => row.type === "ppbs" && Number.isFinite(Number(row.value)));
    const latestFbs = fbs[fbs.length - 1];
    const firstFbs = fbs[0];
    const latestPpbs = ppbs[ppbs.length - 1];
    const firstPpbs = ppbs[0];
    const hba1cValues = fbs.map((row) => estimateHbA1cFromFbs(row.value)).filter((v) => v != null);
    const hba1cDates = fbs.map((row) => formatChartDate(row.recordedAt));
    const latestHba1c = hba1cValues[hba1cValues.length - 1];
    const firstHba1c = hba1cValues[0];

    const byDate = new Map();
    for (const row of filtered) {
      const key = String(row.recordedAt || "").slice(0, 10);
      if (!key) continue;
      const entry = byDate.get(key) || { date: formatChartDate(row.recordedAt), fbs: null, ppbs: null };
      if (row.type === "fbs") entry.fbs = Number(row.value);
      if (row.type === "ppbs") entry.ppbs = Number(row.value);
      byDate.set(key, entry);
    }
    const weekly = [...byDate.values()].slice(-8);

    const stats = [];
    if (latestHba1c != null) {
      stats.push({
        label: "HbA1c",
        value: `${latestHba1c} %`,
        delta: deltaLabel(latestHba1c, firstHba1c, ""),
        latest: latestFbs ? formatDisplayDate(latestFbs.recordedAt) : "",
      });
    }
    if (latestFbs) {
      stats.push({
        label: "FBS",
        value: `${latestFbs.value} mg/dL`,
        delta: deltaLabel(Number(latestFbs.value), firstFbs ? Number(firstFbs.value) : null, ""),
        latest: formatDisplayDate(latestFbs.recordedAt),
      });
    }
    if (latestPpbs) {
      stats.push({
        label: "PPBS",
        value: `${latestPpbs.value} mg/dL`,
        delta: deltaLabel(Number(latestPpbs.value), firstPpbs ? Number(firstPpbs.value) : null, ""),
        latest: formatDisplayDate(latestPpbs.recordedAt),
      });
    }

    return {
      stats,
      hba1cDates: hba1cDates.slice(-8),
      hba1cValues: hba1cValues.slice(-8),
      weekly,
    };
  }, [logs, range]);

  if (!logs.length) return <EmptyLogs label="glucose readings" />;

  return (
    <div className="ua-cp-hptrack-glucose">
      <StatCards stats={view.stats} tone="red" />
      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--red ua-cp-hptrack-glucose__charts">
        <div className="ua-cp-hptrack-glucose__section">
          <div className="ua-cp-hptrack-chart-card__head">
            <strong>HbA1c trend</strong>
            <span className="ua-cp-hptrack-chart-card__target">Estimated from FBS · target &lt; 5.7 %</span>
          </div>
          {view.hba1cValues.length ? (
            <TrendLineChart dates={view.hba1cDates} values={view.hba1cValues} color="#d64545" />
          ) : (
            <EmptyLogs label="FBS readings" />
          )}
        </div>
        <div className="ua-cp-hptrack-glucose__divider" aria-hidden="true" />
        <div className="ua-cp-hptrack-glucose__section">
          <div className="ua-cp-hptrack-chart-card__head">
            <strong>FBS &amp; PPBS</strong>
            <div className="ua-cp-hptrack-chart-card__legend">
              <select className="ua-cp-hptrack-select" value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="all">All since onboarding</option>
                <option value="4w">Last 4 weeks</option>
              </select>
              <span><i style={{ background: "#d64545" }} /> FBS</span>
              <span><i style={{ background: "#ec7a45" }} /> PPBS</span>
            </div>
          </div>
          {view.weekly.length ? (
            <GroupedBarChart
              dates={view.weekly.map((row) => row.date)}
              series={[
                { key: "fbs", values: view.weekly.map((row) => row.fbs) },
                { key: "ppbs", values: view.weekly.map((row) => row.ppbs) },
              ]}
              colors={{ fbs: "#d64545", ppbs: "#ec7a45" }}
            />
          ) : (
            <EmptyLogs label="glucose readings" />
          )}
        </div>
      </div>
    </div>
  );
}

function MenstrualPanel({ logs }) {
  const view = useMemo(() => {
    const sorted = sortByDateAsc(logs, "startDate");
    const rows = sortByDateDesc(logs, "startDate").map((row, index, list) => {
      const older = sorted.findIndex((item) => (item.id || item._id) === (row.id || row._id));
      const next = older >= 0 ? sorted[older + 1] : null;
      const lengthDays = next
        ? Math.round((new Date(`${next.startDate}T12:00:00`).getTime() - new Date(`${row.startDate}T12:00:00`).getTime()) / 86400000)
        : null;
      return {
        id: row.id || row._id || row.startDate,
        date: formatDisplayDate(row.startDate),
        end: formatDisplayDate(row.endDate),
        length: Number.isFinite(lengthDays) && lengthDays > 0 ? `${lengthDays} days` : "—",
        lengthDays,
        latest: index === 0,
      };
    });
    const lengths = rows.map((row) => row.lengthDays).filter((n) => Number.isFinite(n) && n > 0);
    const avg = lengths.length ? Math.round(lengths.reduce((sum, n) => sum + n, 0) / lengths.length) : null;
    const spread = lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : 0;
    const latest = rows[0];
    return {
      rows,
      stats: [
        { label: "Avg cycle length", value: avg != null ? `${avg} days` : "—" },
        { label: "Regularity", value: lengths.length < 2 ? "—" : spread > 7 ? "Irregular" : "Regular" },
        { label: "Last period", value: latest?.date || "—" },
        { label: "Cycles logged", value: String(rows.length) },
      ],
    };
  }, [logs]);

  if (!logs.length) return <EmptyLogs label="cycle dates" />;

  return (
    <div className="ua-cp-hptrack-menstrual">
      <StatCards stats={view.stats} tone="purple" variant="summary" />
      <div className="ua-cp-hptrack-card ua-cp-hptrack-card--purple">
        <div className="ua-cp-hptrack-card__head">
          <strong>Logged cycle dates</strong>
        </div>
        <div className="ua-cp-hptrack-cycle-table">
          <div className="ua-cp-hptrack-cycle-table__head">
            <div>Period start</div><div>Period end</div><div>Cycle length</div>
          </div>
          {view.rows.map((row) => (
            <div key={row.id} className="ua-cp-hptrack-cycle-table__row">
              <div className="ua-cp-hptrack-cycle-table__start">
                {row.date}
                {row.latest ? <span className="ua-cp-hptrack-cycle-table__latest">Latest</span> : null}
              </div>
              <div>{row.end}</div>
              <div>{row.length}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BpPanel({ logs }) {
  const [range, setRange] = useState("all");
  const view = useMemo(() => {
    const filtered = applyRange(sortByDateAsc(logs), range).filter((row) => (
      Number.isFinite(Number(row.sys)) && Number.isFinite(Number(row.dia))
    ));
    const latest = filtered[filtered.length - 1];
    const first = filtered[0];
    const stats = latest ? [
      {
        label: "Systolic",
        value: `${latest.sys} mmHg`,
        delta: deltaLabel(Number(latest.sys), first ? Number(first.sys) : null, ""),
        latest: formatDisplayDate(latest.recordedAt),
      },
      {
        label: "Diastolic",
        value: `${latest.dia} mmHg`,
        delta: deltaLabel(Number(latest.dia), first ? Number(first.dia) : null, ""),
        latest: formatDisplayDate(latest.recordedAt),
      },
      {
        label: "Latest",
        value: `${latest.sys}/${latest.dia}`,
        delta: "",
        latest: formatDisplayDate(latest.recordedAt),
      },
      {
        label: "Readings logged",
        value: String(logs.length),
        delta: "",
        latest: formatDisplayDate(latest.recordedAt),
      },
    ] : [];
    return {
      stats,
      dates: filtered.map((row) => formatChartDate(row.recordedAt)),
      systolic: filtered.map((row) => Number(row.sys)),
      diastolic: filtered.map((row) => Number(row.dia)),
    };
  }, [logs, range]);

  if (!logs.length) return <EmptyLogs label="blood pressure readings" />;

  return (
    <>
      <StatCards stats={view.stats} tone="amber" />
      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--amber">
        <div className="ua-cp-hptrack-chart-card__head">
          <strong>Systolic &amp; Diastolic</strong>
          <div className="ua-cp-hptrack-chart-card__legend">
            <select className="ua-cp-hptrack-select" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All since onboarding</option>
              <option value="4w">Last 4 weeks</option>
            </select>
            <span><i style={{ background: "#ec7a45" }} /> Systolic</span>
            <span><i style={{ background: "#d4a017" }} /> Diastolic</span>
          </div>
        </div>
        {view.dates.length ? (
          <GroupedBarChart
            dates={view.dates}
            series={[
              { key: "sys", values: view.systolic },
              { key: "dia", values: view.diastolic },
            ]}
            colors={{ sys: "#ec7a45", dia: "#d4a017" }}
          />
        ) : (
          <EmptyLogs label="blood pressure readings" />
        )}
      </div>
    </>
  );
}

function ConditionPanel({ logs }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const row of sortByDateDesc(logs)) {
      const key = String(row.bodyPart || "other").toLowerCase();
      const label = bodyPartLabel(row);
      const group = map.get(key) || { id: key, name: label, photos: [] };
      group.photos.push({
        id: row.id || row._id,
        date: formatDisplayDate(row.recordedAt),
        url: row.picUrl || null,
      });
      map.set(key, group);
    }
    return [...map.values()];
  }, [logs]);

  const [condition, setCondition] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!groups.length) {
      setCondition("");
      return;
    }
    if (!groups.some((group) => group.id === condition)) {
      setCondition(groups[0].id);
    }
  }, [groups, condition]);

  const selected = groups.find((group) => group.id === condition) || groups[0];
  const photos = selected?.photos || [];
  const latest = photos.slice(0, 2);

  if (!logs.length) return <EmptyLogs label="condition photos" />;

  return (
    <div className="ua-cp-hptrack-condition">
      <div className="ua-cp-hptrack-condition-bar">
        <div className="ua-cp-hptrack-condition-bar__left">
          <select className="ua-cp-hptrack-condition-bar__select" value={selected?.id || ""} onChange={(e) => setCondition(e.target.value)}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
      </div>

      <p className="ua-cp-hptrack-condition-hint">
        Compare the two most recent uploads for {selected?.name}.
        {" "}
        <button type="button" className="ua-cp-hptrack-condition-hint__link" onClick={() => setHistoryOpen(true)}>Open history</button>
        {" "}
        to review earlier dates.
      </p>

      <div className="ua-cp-hptrack-comparison">
        <div className="ua-cp-hptrack-comparison__head">
          <span>Latest comparison</span>
          <button type="button" className="ua-cp-hptrack-view-history" onClick={() => setHistoryOpen(true)}>View history</button>
        </div>
        {!latest.length ? (
          <EmptyLogs label="photos for this body part" />
        ) : (
          <div className="ua-cp-hptrack-photo-grid">
            <ConditionPhotoCard photo={latest[0]} label="Latest" />
            {latest[1] ? (
              <ConditionPhotoCard photo={latest[1]} label="Previous" />
            ) : (
              <ConditionEmptySlot label="Previous" />
            )}
          </div>
        )}
      </div>

      <ConditionHistoryModal
        open={historyOpen}
        condition={selected?.name || "Condition"}
        photos={photos}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}

function TrackerDetail({ tracker, logs }) {
  switch (tracker.id) {
    case "fatloss": return <FatLossPanel logs={logs.weight} />;
    case "glucose": return <GlucosePanel logs={logs.glucose} />;
    case "menstrual": return <MenstrualPanel logs={logs.menstrual} />;
    case "bp": return <BpPanel logs={logs.bp} />;
    case "condition": return <ConditionPanel logs={logs.condition} />;
    default: return null;
  }
}

const EMPTY_LOGS = { weight: [], glucose: [], bp: [], menstrual: [], condition: [] };

export function HealthProgressSection({ user, onToast }) {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("program");
  const scrolled = useRef(false);
  const userId = user?.id;
  const isMock = isMockNumericId(userId);

  const [trackers, setTrackers] = useState(() => CLIENT_HEALTH_TRACKERS.map((row) => ({ ...row, enabled: false })));
  const [isFemale, setIsFemale] = useState(true);
  const [search, setSearch] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [loading, setLoading] = useState(() => Boolean(userId) && !isMock);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [logs, setLogs] = useState(EMPTY_LOGS);

  const liveCount = trackers.filter((t) => t.enabled).length;
  const enabledKey = trackers.filter((t) => t.enabled).map((t) => t.featureKey).sort().join(",");

  const filteredTrackers = useMemo(() => {
    let list = trackers;
    if (trackingFilter !== "all") list = list.filter((t) => t.id === trackingFilter);
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
    if (!userId || isMock) {
      setLoading(false);
      setError(isMock ? "Demo profile ids cannot load health progress." : "");
      setTrackers(CLIENT_HEALTH_TRACKERS.map((row) => ({ ...row, enabled: false })));
      setLogs(EMPTY_LOGS);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    fetchHealthProgressSettings(userId)
      .then((result) => {
        if (cancelled || !result) return;
        setIsFemale(result.isFemale);
        setTrackers(CLIENT_HEALTH_TRACKERS.map((row) => ({
          ...row,
          enabled: Boolean(result.settings[row.featureKey]),
        })));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load health progress settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isMock]);

  useEffect(() => {
    if (!userId || isMock || loading) return undefined;
    const enabled = Object.fromEntries(trackers.map((row) => [row.featureKey, row.enabled]));
    let cancelled = false;
    setLogsLoading(true);
    Promise.all([
      enabled.weightPic ? fetchWeightLogs(userId) : Promise.resolve([]),
      enabled.glucose ? fetchGlucoseLogs(userId) : Promise.resolve([]),
      enabled.bloodPressure ? fetchBloodPressureLogs(userId) : Promise.resolve([]),
      enabled.menstrualCycle ? fetchMenstrualCycleLogs(userId) : Promise.resolve([]),
      enabled.conditionComparison ? fetchConditionLogs(userId) : Promise.resolve([]),
    ])
      .then(([weight, glucose, bp, menstrual, condition]) => {
        if (cancelled) return;
        setLogs({
          weight: weight || [],
          glucose: glucose || [],
          bp: bp || [],
          menstrual: menstrual || [],
          condition: condition || [],
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLogs(EMPTY_LOGS);
          onToast?.(err.message || "Could not load health progress logs");
        }
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isMock, loading, enabledKey]);

  useEffect(() => {
    if (trackingFilter === "all") return undefined;
    const el = document.getElementById(`hp-tracker-${trackingFilter}`);
    if (!el) return undefined;
    const timer = window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [trackingFilter, visibleDetailTrackers.length]);

  useEffect(() => {
    const programMap = {
      "fat-loss": "fatloss",
      diabetes: "glucose",
      pcod: "menstrual",
      gut: "condition",
    };
    const mapped = programMap[focusId] || focusId;
    const target = mapped ? `hp-tracker-${mapped}` : null;
    if (!target || scrolled.current) return undefined;
    const el = document.getElementById(target);
    if (!el) return undefined;
    scrolled.current = true;
    const timer = window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [focusId, visibleDetailTrackers.length]);

  async function toggleTracker(id) {
    const tracker = trackers.find((row) => row.id === id);
    if (!tracker) return;
    if (tracker.featureKey === "menstrualCycle" && !isFemale && !isMock) {
      onToast?.("Menstrual cycle is only available for female clients");
      return;
    }
    const nextEnabled = !tracker.enabled;
    setTrackers((list) => list.map((row) => (row.id === id ? { ...row, enabled: nextEnabled } : row)));
    if (isMock) {
      onToast?.("Demo profiles cannot update trackers.");
      setTrackers((list) => list.map((row) => (row.id === id ? { ...row, enabled: tracker.enabled } : row)));
      return;
    }
    setSavingId(id);
    try {
      const result = await updateHealthProgressSettings(userId, { [tracker.featureKey]: nextEnabled });
      if (result?.settings) {
        setIsFemale(result.isFemale);
        setTrackers((list) => list.map((row) => ({
          ...row,
          enabled: Boolean(result.settings[row.featureKey]),
        })));
      }
      onToast?.("Tracker updated");
    } catch (err) {
      setTrackers((list) => list.map((row) => (row.id === id ? { ...row, enabled: tracker.enabled } : row)));
      onToast?.(err.message || "Could not update tracker");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="ua-cp-section ua-cp-hptrack">
      <div className="ua-cp-hptrack__head">
        <div>
          <h2 className="ua-cp-hptrack__title">Health Progress</h2>
          <p className="ua-cp-hptrack__sub">What this client is tracking. Enable a tracker to show it in their app.</p>
          <span className="ua-cp-hptrack__live">Trackers · {liveCount} of {trackers.length} live in app</span>
          {loading ? <p className="ua-cp-hptrack__status">Loading health progress…</p> : null}
          {error && !loading ? <p className="ua-cp-hptrack__status ua-cp-hptrack__status--error">{error}</p> : null}
          {logsLoading && !loading ? <p className="ua-cp-hptrack__status">Loading tracker history…</p> : null}
        </div>
        <label className="ua-cp-hptrack__filter">
          <span>Tracking</span>
          <select value={trackingFilter} onChange={(e) => setTrackingFilter(e.target.value)}>
            {CLIENT_TRACKING_FILTER_OPTIONS.map((option) => (
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
          {filteredTrackers.map((tracker) => {
            const menstrualLocked = tracker.featureKey === "menstrualCycle" && !isFemale && !isMock;
            return (
              <div key={tracker.id} className={`ua-cp-hptrack-list__row${menstrualLocked ? " ua-cp-hptrack-list__row--locked" : ""}`}>
                <span className="ua-cp-hptrack-list__dot" style={{ background: tracker.color }} />
                <div className="ua-cp-hptrack-list__copy">
                  <strong>{tracker.name}</strong>
                  <span> · {menstrualLocked ? "Female clients only" : tracker.category}</span>
                </div>
                {tracker.enabled ? <span className="ua-cp-hptrack-list__status">Live in app</span> : null}
                <button
                  type="button"
                  className={`ua-toggle${tracker.enabled ? " ua-toggle--on" : ""}`}
                  aria-pressed={tracker.enabled}
                  disabled={loading || savingId === tracker.id || menstrualLocked}
                  onClick={() => toggleTracker(tracker.id)}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ua-cp-hptrack-details">
        {!loading && !visibleDetailTrackers.length ? (
          <p className="ua-cp-hptrack-empty">No trackers enabled. Turn one on to show it in the client app.</p>
        ) : null}
        {visibleDetailTrackers.map((tracker) => (
          <section key={tracker.id} className="ua-cp-hptrack-detail">
            <TrackerSectionHeader tracker={tracker} />
            <TrackerDetail tracker={tracker} logs={logs} />
          </section>
        ))}
      </div>
    </div>
  );
}
