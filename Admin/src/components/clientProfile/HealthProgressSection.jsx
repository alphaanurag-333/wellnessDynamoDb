import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createCoachWeightLog,
  deleteCoachWeightPhoto,
  reviewCoachWeightPhoto,
  reviewCoachGlucosePhoto,
  reviewCoachBloodPressurePhoto,
  reviewCoachConditionPhoto,
  fetchBloodPressureLogs,
  fetchConditionLogs,
  fetchGlucoseLogs,
  fetchHealthProgressSettings,
  fetchMenstrualCycleLogs,
  fetchWeightLogs,
  patchHealthProgressClientUpload,
  updateHealthProgressSettings,
} from "../../api/healthProgressApi.js";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  CLIENT_HEALTH_TRACKERS,
  CLIENT_TRACKING_FILTER_OPTIONS,
} from "../../data/healthProgressData.js";
import { fetchUserLabReports } from "../../api/onboardingApi.js";
import { todayIsoDate } from "../../utils/adminDateLimits.js";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

const CLIENT_UPLOAD_FEATURE_KEYS = ["weightPic", "glucose", "bloodPressure", "conditionComparison"];

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
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function formatDisplayDateTime(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const isoDate = raw.length <= 10 ? `${raw}T12:00:00` : raw;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return raw;
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  if (raw.length <= 10) return date;
  const time = d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).toLowerCase();
  return `${date}, ${time}`;
}

function imageStamp(row) {
  return row?.photoTakenAt || row?.updatedAt || row?.createdAt || row?.recordedAt || "";
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

function calendarDateKey(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weightLogRecency(row) {
  const time = new Date(row?.updatedAt || row?.createdAt || row?.recordedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function photoKeyFor(photoField) {
  if (photoField === "glucosePicUrl") return "glucosePicKey";
  if (photoField === "weightPicUrl") return "weightPicKey";
  if (photoField === "bpPicUrl") return "bpPicKey";
  if (photoField === "picUrl") return "picKey";
  return "";
}

const REVIEW_FIELDS_BY_PHOTO = {
  weightPicUrl: { status: "weightPicReviewStatus", reason: "weightPicRejectionReason" },
  glucosePicUrl: { status: "glucosePicReviewStatus", reason: "glucosePicRejectionReason" },
  bpPicUrl: { status: "bpPicReviewStatus", reason: "bpPicRejectionReason" },
  picUrl: { status: "picReviewStatus", reason: "picRejectionReason" },
};

function collapseLogsByDate(logs, typeField, photoField = "weightPicUrl") {
  const groups = new Map();
  for (const row of logs || []) {
    const date = calendarDateKey(row?.recordedAt) || String(row?.id || row?._id || "");
    if (!date) continue;
    const type = typeField ? String(row?.[typeField] || "").toLowerCase() : "";
    const key = type ? `${date}:${type}` : date;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const photoKey = photoKeyFor(photoField);
  const collapsed = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => weightLogRecency(b) - weightLogRecency(a));
    const latest = rows[0];
    const withPhoto = rows.find((row) => row?.[photoField]);
    const photoSource = withPhoto || (latest?.[photoField] ? latest : null);
    const stamped = photoSource
      ? { ...latest, photoTakenAt: photoSource.updatedAt || photoSource.createdAt || photoSource.recordedAt }
      : latest;
    const reviewMeta = REVIEW_FIELDS_BY_PHOTO[photoField];
    const review = reviewMeta && withPhoto
      ? {
          [reviewMeta.status]: withPhoto[reviewMeta.status] || "pending",
          [reviewMeta.reason]: withPhoto[reviewMeta.reason] || "",
        }
      : {};
    if (!withPhoto || latest?.[photoField] || withPhoto === latest) {
      collapsed.push({ ...stamped, ...review });
      continue;
    }
    collapsed.push({
      ...stamped,
      ...review,
      [photoField]: withPhoto[photoField],
      ...(photoKey ? { [photoKey]: withPhoto[photoKey] } : {}),
      photoLogId: withPhoto.id || withPhoto._id,
    });
  }
  return collapsed;
}

function collapseWeightLogsByDate(logs) {
  return collapseLogsByDate(logs);
}

function sortByDateDesc(items, key = "recordedAt") {
  return [...items].sort((a, b) => new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime());
}

function applyRange(logs, range, key = "recordedAt") {
  const weeks = { "4w": 4, "8w": 8, "12w": 12 }[range];
  if (!weeks) return logs;
  const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
  return logs.filter((row) => new Date(row[key] || 0).getTime() >= cutoff);
}

function isHba1cMarker(name) {
  const normalized = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    normalized === "hba1c"
    || normalized.includes("hba1c")
    || normalized.includes("glycated hemoglobin")
    || normalized.includes("glycated haemoglobin")
    || /\ba1c\b/.test(normalized)
  );
}

function parseMarkerNumericValue(raw) {
  if (raw == null || raw === "" || raw === "—") return null;
  const match = String(raw).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function hba1cReadingsFromReports(reports) {
  const readings = [];
  for (const report of reports || []) {
    if (String(report?.aiStatus || "").trim().toLowerCase() !== "analysed") continue;
    const panels = report?.aiAnalysis?.panels;
    if (!Array.isArray(panels) || !panels.length) continue;

    let value = null;
    for (const panel of panels) {
      for (const row of panel?.rows || []) {
        if (!isHba1cMarker(row?.name)) continue;
        const parsed = parseMarkerNumericValue(row?.value);
        if (parsed == null || parsed < 4 || parsed > 15) continue;
        value = Number(parsed.toFixed(1));
        break;
      }
      if (value != null) break;
    }
    if (value == null) continue;

    const recordedAt = String(report.reportDate || report.aiAnalysedAt || report.createdAt || "").trim();
    if (!recordedAt) continue;
    const updatedAt = new Date(report.updatedAt || report.aiAnalysedAt || report.createdAt || 0).getTime();
    readings.push({
      value,
      recordedAt,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
      reportId: report.id || report._id || recordedAt,
    });
  }

  readings.sort((a, b) => {
    const byDate = String(a.recordedAt).localeCompare(String(b.recordedAt));
    if (byDate) return byDate;
    return a.updatedAt - b.updatedAt;
  });

  const byDate = new Map();
  for (const reading of readings) {
    byDate.set(calendarDateKey(reading.recordedAt) || reading.reportId, reading);
  }
  return [...byDate.values()];
}

function glucosePhotoUrl(row) {
  const url = String(row?.glucosePicUrl || row?.imageUrl || row?.photoUrl || "").trim();
  return url;
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

function ChartPlot({ children, minWidthPx }) {
  return (
    <div className="ua-cp-hptrack-chart-plot">
      <div className="ua-cp-hptrack-chart-scroll">
        <div
          className="ua-cp-hptrack-chart-scroll__inner"
          style={minWidthPx ? { minWidth: `max(100%, ${minWidthPx}px)` } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyLogs({ label }) {
  return <p className="ua-cp-hptrack-empty">No {label} logged yet.</p>;
}

const WEIGHT_LIMITS = {
  kg: { max: 500, maxLen: 5 },
  lbs: { max: 1102, maxLen: 6 },
};
const WEIGHT_NAV_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

function weightLimits(unit) {
  return unit === "lbs" || unit === "lb" ? WEIGHT_LIMITS.lbs : WEIGHT_LIMITS.kg;
}

function sanitizeWeightInput(raw, unit) {
  const { max, maxLen } = weightLimits(unit);
  let next = String(raw ?? "").replace(/[^\d.]/g, "");
  if (!next) return "";

  const firstDot = next.indexOf(".");
  if (firstDot !== -1) {
    const whole = next.slice(0, firstDot);
    const fraction = next.slice(firstDot + 1).replace(/\./g, "").slice(0, 1);
    next = `${whole}.${fraction}`;
  }
  if (next.startsWith(".")) next = `0${next}`;
  next = next.slice(0, maxLen);
  if (next && !next.endsWith(".")) {
    const n = Number(next);
    if (Number.isFinite(n) && n > max) return String(max);
  }
  return next;
}

function weightFieldError(value, unit) {
  if (value === "" || value == null) return "";
  const text = String(value);
  if (text === "." || text.endsWith(".")) return "";
  const { max } = weightLimits(unit);
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) {
    return "Weight must be greater than 0";
  }
  if (n > max) {
    return `Weight must be at most ${max} ${unit === "lbs" ? "lbs" : "kg"}`;
  }
  return "";
}

function blockInvalidWeightKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (WEIGHT_NAV_KEYS.has(event.key)) return;
  if (event.key.length === 1 && !/[\d.]/.test(event.key)) event.preventDefault();
}

function blockNonDecimalWeightBeforeInput(event) {
  if (event.data == null) return;
  if (!/^[\d.]+$/.test(event.data)) {
    event.preventDefault();
    return;
  }
  if (event.data.includes(".") && String(event.target?.value || "").includes(".")) {
    event.preventDefault();
  }
}

function FatLossJourneyChart({ dates, values, color = "#e98c64" }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  // Bars grow from baseline; leave headroom for value labels above points
  const heights = values.map((v) => Math.max(20, ((v - min) / span) * 58 + 20));
  const paleBar = "#fbe5d6";
  const n = values.length;

  // Equal columns, no flex gap — x centers must match column midpoints exactly
  const linePoints = heights
    .map((h, i) => {
      const x = ((i + 0.5) / n) * 100;
      const y = 100 - h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <ChartPlot minWidthPx={n * 52}>
      <div className="ua-cp-hptrack-fatloss-chart">
        <div className="ua-cp-hptrack-fatloss-chart__plot">
          <svg className="ua-cp-hptrack-fatloss-chart__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={linePoints}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="ua-cp-hptrack-fatloss-chart__cols">
            {values.map((value, index) => (
              <div key={`${dates[index]}-${index}`} className="ua-cp-hptrack-fatloss-chart__col">
                <div className="ua-cp-hptrack-fatloss-chart__bar-area">
                  <span
                    className="ua-cp-hptrack-fatloss-chart__val"
                    style={{
                      color,
                      bottom: `calc(${heights[index]}% + 12px)`,
                    }}
                  >
                    {value}
                  </span>
                  <span
                    className="ua-cp-hptrack-fatloss-chart__bar"
                    style={{
                      height: `${heights[index]}%`,
                      background: paleBar,
                    }}
                  />
                  <span
                    className="ua-cp-hptrack-fatloss-chart__dot"
                    style={{
                      bottom: `${heights[index]}%`,
                      borderColor: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ua-cp-hptrack-fatloss-chart__days">
          {dates.map((date, index) => (
            <span key={`${date}-${index}`} className="ua-cp-hptrack-fatloss-chart__day">{date}</span>
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

function StatPhoto({ url, label, caption }) {
  const [failed, setFailed] = useState(false);
  if (!url) return null;
  if (failed) {
    return (
      <a className="ua-cp-hptrack-stat__photo ua-cp-hptrack-stat__photo--empty" href={url} target="_blank" rel="noreferrer">
        Open photo
      </a>
    );
  }
  return (
    <div className="ua-cp-hptrack-stat__photo-wrap">
      <button
        type="button"
        className="ua-cp-hptrack-stat__photo"
        aria-label={caption ? `Open ${label} photo from ${caption}` : `Open ${label} photo`}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      >
        <img src={url} alt={`${label} reading submitted in the app`} onError={() => setFailed(true)} />
      </button>
      {caption ? <span className="ua-cp-hptrack-stat__photo-time">{caption}</span> : null}
    </div>
  );
}

function StatCards({ stats, tone = "default", variant = "full" }) {
  if (!stats?.length) return null;
  return (
    <div className="ua-cp-hptrack-stats">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`ua-cp-hptrack-stat ua-cp-hptrack-stat--${tone}${stat.photoUrl ? " ua-cp-hptrack-stat--with-photo" : ""}`}
        >
          <div className="ua-cp-hptrack-stat__copy">
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
            {stat.note ? (
              <span className="ua-cp-hptrack-stat__latest">{stat.note}</span>
            ) : null}
          </div>
          <StatPhoto url={stat.photoUrl} label={stat.label} caption={stat.photoCaption} />
        </div>
      ))}
    </div>
  );
}

function clientUploadHint(window) {
  if (window?.open && window.source === "saturday") {
    return "Open for Saturday. Closes after the client saves.";
  }
  if (window?.open) {
    return "Opened by a coach. Closes after the client saves.";
  }
  return "Opens again on Saturday, or a wellness coach can open it now.";
}

function ClientUploadControl({
  featureKey,
  window,
  canEnable,
  trackerEnabled,
  busy,
  onOpen,
  onClose,
  compact = false,
}) {
  if (!CLIENT_UPLOAD_FEATURE_KEYS.includes(featureKey)) return null;
  const open = Boolean(window?.open);
  const canChange = canEnable && trackerEnabled;
  return (
    <div className={`ua-cp-hptrack-upload${compact ? " ua-cp-hptrack-upload--inline" : ""}`}>
      <span className={open ? "is-open" : ""}>{open ? "Client can update" : "Client update closed"}</span>
      {compact ? null : <span className="ua-cp-hptrack-upload__hint">{clientUploadHint(window)}</span>}
      {canChange && !open ? (
        <button type="button" disabled={busy} onClick={() => onOpen(featureKey)}>
          {busy ? "Opening…" : compact ? "Open" : "Open client update"}
        </button>
      ) : null}
      {canChange && open ? (
        <button
          type="button"
          className="ua-cp-hptrack-upload__close"
          disabled={busy}
          onClick={() => onClose(featureKey)}
        >
          {busy ? "Closing…" : compact ? "Close" : "Close client update"}
        </button>
      ) : null}
    </div>
  );
}

function TrackerSectionHeader({ tracker }) {
  return (
    <div className="ua-cp-hptrack-section-head" id={`hp-tracker-${tracker.id}`}>
      <span className="ua-cp-hptrack-section-head__dot" style={{ background: tracker.color }} />
      <h3 style={{textTransform: "capitalize"}}>{tracker.name}</h3>
    </div>
  );
}

function ConfirmModal({ open, title, body, confirmLabel, busy, tone = "danger", onClose, onConfirm, children }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, open, onClose]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={busy ? undefined : onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-reflect-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="hp-photo-delete-title">
        <p className={`ua-cp-reflect-modal__eyebrow${tone === "danger" ? " ua-cp-reflect-modal__eyebrow--danger" : ""}`}>
          {tone === "danger" ? "Permanent" : "Review"}
        </p>
        <h3 id="hp-photo-delete-title" className="ua-cp-reflect-modal__title">{title}</h3>
        {body ? <p className="ua-cp-reflect-modal__body">{body}</p> : null}
        {children}
        <div className="ua-cp-reflect-modal__foot">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline" disabled={busy} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ua-cp-btn${tone === "danger" ? " ua-cp-reflect-modal__confirm--danger" : " ua-cp-btn--primary"}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function uploadPhotoReviewTone(status) {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

function uploadPhotoReviewLabel(status) {
  if (status === "approved") return "Accepted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function WeightPhotoCard({ photo, canDelete, deleting, reviewing, onDelete, onReview }) {
  const openPhoto = () => {
    if (photo.url && photo.url !== "mock") window.open(photo.url, "_blank", "noopener,noreferrer");
  };
  const tone = uploadPhotoReviewTone(photo.reviewStatus);
  const hasPhoto = Boolean(photo.url && photo.url !== "mock");

  return (
    <div className="ua-cp-hptrack-weight-photo-card">
      {canDelete && hasPhoto ? (
        <button
          type="button"
          className="ua-cp-hptrack-weight-photo-card__remove"
          disabled={deleting || reviewing}
          aria-label={`Delete photo from ${photo.date}`}
          onClick={() => onDelete?.(photo)}
        >
          ×
        </button>
      ) : null}
      <div
        className={`ua-cp-hptrack-weight-photo-card__media${
          hasPhoto ? " ua-cp-hptrack-weight-photo-card__media--photo" : ""
        }`}
      >
        {hasPhoto ? (
          <img className="ua-cp-hptrack-weight-photo-card__img" src={photo.url} alt={`${photo.weight} kg`} />
        ) : (
          <span className="ua-cp-hptrack-weight-photo-card__camera" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        )}
        {hasPhoto ? (
          <span className={`ua-cp-hptrack-weight-photo-card__badge ua-cp-hptrack-weight-photo-card__badge--${tone}`}>
            {uploadPhotoReviewLabel(photo.reviewStatus)}
          </span>
        ) : null}
        <strong>{photo.weight} {photo.unit}</strong>
      </div>
      <div className="ua-cp-hptrack-weight-photo-card__meta">
        <span>{photo.date}</span>
        {hasPhoto ? (
          <button type="button" className="ua-cp-hptrack-weight-photo-card__save" onClick={openPhoto}>
            Open
          </button>
        ) : null}
      </div>
      {hasPhoto ? (
        <div className="ua-cp-hptrack-weight-photo-card__actions">
          <button
            type="button"
            className={`ua-cp-hptrack-weight-photo-card__approve${tone === "approved" ? " ua-cp-hptrack-weight-photo-card__approve--done" : ""}`}
            disabled={reviewing || deleting || tone === "approved"}
            onClick={() => onReview?.(photo, "approved")}
          >
            {reviewing && tone !== "approved" ? "Saving…" : "Accept"}
          </button>
          <button
            type="button"
            className={`ua-cp-hptrack-weight-photo-card__reject${tone === "rejected" ? " ua-cp-hptrack-weight-photo-card__reject--done" : ""}`}
            disabled={reviewing || deleting || tone === "rejected"}
            onClick={() => onReview?.(photo, "rejected")}
          >
            Reject
          </button>
        </div>
      ) : null}
      {photo.rejectionReason ? (
        <p className="ua-cp-hptrack-weight-photo-card__reason">{photo.rejectionReason}</p>
      ) : null}
    </div>
  );
}

function WeightPhotoHistoryModal({ open, photos, canDelete, deletingId, reviewingId, onDelete, onReview, onClose }) {
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
            <p>Every weigh-in photo the client uploaded, newest first. Accept or reject each image.</p>
          </div>
          <button type="button" className="ua-cp-hptrack-weight-history-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="ua-cp-hptrack-weight-history-modal__grid">
          {photos.length ? photos.map((photo) => (
            <WeightPhotoCard
              key={photo.id}
              photo={photo}
              canDelete={canDelete}
              deleting={deletingId === photo.id}
              reviewing={reviewingId === photo.id}
              onDelete={onDelete}
              onReview={onReview}
            />
          )) : <EmptyLogs label="weight photos" />}
        </div>
      </div>
    </div>
  );
}

function UploadPhotoReviewSection({
  title,
  subtitle,
  photos,
  userId,
  isMock,
  onToast,
  reviewPhoto,
  onReviewed,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewingPhotoId, setReviewingPhotoId] = useState("");
  const [pendingReview, setPendingReview] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!photos.length) return null;

  function requestReview(photo, action) {
    if (!photo?.id || reviewingPhotoId) return;
    setRejectReason("");
    setPendingReview({ photo, action });
  }

  async function confirmReview() {
    const photo = pendingReview?.photo;
    const action = pendingReview?.action;
    if (!photo?.id || !action || isMock) return;
    setReviewingPhotoId(photo.id);
    try {
      const result = await reviewPhoto(userId, photo.id, {
        action,
        rejectionReason: action === "rejected" ? rejectReason.trim() : "",
      });
      onToast?.(action === "approved" ? "Upload accepted" : "Upload rejected");
      setPendingReview(null);
      setRejectReason("");
      await onReviewed?.(result);
    } catch (err) {
      onToast?.(err.message || "Could not update the photo review");
    } finally {
      setReviewingPhotoId("");
    }
  }

  return (
    <>
      <div className="ua-cp-hptrack-upload-review-bar">
        <div>
          <strong>{title}</strong>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button type="button" className="ua-cp-hptrack-view-history" onClick={() => setHistoryOpen(true)}>
          Review uploads ({photos.length})
        </button>
      </div>

      <WeightPhotoHistoryModal
        open={historyOpen}
        photos={photos}
        canDelete={false}
        deletingId=""
        reviewingId={reviewingPhotoId}
        onDelete={() => {}}
        onReview={requestReview}
        onClose={() => {
          if (reviewingPhotoId) return;
          setHistoryOpen(false);
        }}
      />

      <ConfirmModal
        open={Boolean(pendingReview)}
        tone={pendingReview?.action === "rejected" ? "danger" : "primary"}
        title={pendingReview?.action === "rejected"
          ? `Reject the upload from ${pendingReview?.photo?.date}?`
          : `Accept the upload from ${pendingReview?.photo?.date || "this date"}?`}
        body={pendingReview?.action === "rejected"
          ? "The photo stays on the entry and is marked rejected. The client can upload again after you reject it."
          : "The photo stays on the entry and is marked accepted. Client re-upload stays locked until the next window opens."}
        confirmLabel={reviewingPhotoId
          ? "Saving…"
          : pendingReview?.action === "rejected" ? "Yes, reject it" : "Yes, accept it"}
        busy={Boolean(reviewingPhotoId)}
        onClose={() => {
          if (reviewingPhotoId) return;
          setPendingReview(null);
          setRejectReason("");
        }}
        onConfirm={confirmReview}
      >
        {pendingReview?.action === "rejected" ? (
          <label className="ua-cp-hptrack-weight-review-reason">
            Rejection reason
            <textarea
              rows={3}
              value={rejectReason}
              maxLength={500}
              placeholder="Optional"
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </label>
        ) : null}
      </ConfirmModal>
    </>
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

function ConditionHistoryModal({ open, condition, photos, onClose, title, subtitle }) {
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
            <h3 id="condition-history-title">{title || "Condition photo history"}</h3>
            <p>{subtitle || `${condition} · every uploaded date, newest first`}</p>
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

function FatLossPanel({ logs, userId, isMock, onToast, onWeightAdded, onClientUploadChange }) {
  const [range, setRange] = useState("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState("");
  const [reviewingPhotoId, setReviewingPhotoId] = useState("");
  const [pendingReview, setPendingReview] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [latestPhotoFailed, setLatestPhotoFailed] = useState(false);
  const [recordedDate, setRecordedDate] = useState(todayIsoDate);
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightPhotoFile, setWeightPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const dateInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const weightPhotoPreview = useMemo(() => {
    if (!weightPhotoFile) return "";
    return URL.createObjectURL(weightPhotoFile);
  }, [weightPhotoFile]);

  useEffect(() => () => {
    if (weightPhotoPreview) URL.revokeObjectURL(weightPhotoPreview);
  }, [weightPhotoPreview]);

  const dailyLogs = useMemo(() => collapseWeightLogsByDate(logs), [logs]);

  const photos = useMemo(() => (
    sortByDateDesc(dailyLogs)
      .filter((row) => row.weightPicUrl)
      .map((row) => ({
        id: row.photoLogId || row.id || row._id,
        date: formatDisplayDateTime(imageStamp(row)),
        weight: Number.isFinite(Number(row.weightKg)) ? Number(row.weightKg) : "—",
        unit: "kg",
        url: row.weightPicUrl,
        reviewStatus: row.weightPicReviewStatus || "pending",
        rejectionReason: row.weightPicRejectionReason || "",
      }))
  ), [dailyLogs]);

  const latestPhoto = photos[0] || null;

  useEffect(() => {
    setLatestPhotoFailed(false);
  }, [latestPhoto?.url]);

  const series = useMemo(() => {
    const filtered = applyRange(sortByDateAsc(dailyLogs), range).filter((row) => Number.isFinite(Number(row.weightKg)));
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
  }, [dailyLogs, range]);

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  }

  function onPhotoSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast?.("Choose an image file");
      event.target.value = "";
      return;
    }
    setWeightPhotoFile(file);
  }

  function clearSelectedPhoto() {
    setWeightPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  const limits = weightLimits(weightUnit);
  const weightError = weightFieldError(weightValue, weightUnit);
  const canSubmitWeight = Boolean(weightValue)
    && !weightError
    && !String(weightValue).endsWith(".")
    && Boolean(recordedDate)
    && recordedDate <= todayIsoDate();

  function onWeightChange(event) {
    setWeightValue(sanitizeWeightInput(event.target.value, weightUnit));
  }

  function onWeightUnitChange(nextUnit) {
    setWeightUnit(nextUnit);
    setWeightValue((prev) => {
      const next = sanitizeWeightInput(prev, nextUnit);
      return next.endsWith(".") ? next.slice(0, -1) : next;
    });
  }

  async function confirmDeletePhoto() {
    const photo = pendingPhotoDelete;
    if (!photo?.id || isMock) return;
    setDeletingPhotoId(photo.id);
    try {
      await deleteCoachWeightPhoto(userId, photo.id);
      onToast?.("Weight photo deleted");
      setPendingPhotoDelete(null);
      await onWeightAdded?.();
    } catch (err) {
      onToast?.(err.message || "Could not delete weight photo");
    } finally {
      setDeletingPhotoId("");
    }
  }

  function requestReview(photo, action) {
    if (!photo?.id || reviewingPhotoId || deletingPhotoId) return;
    setRejectReason("");
    setPendingReview({ photo, action });
  }

  async function confirmReview() {
    const photo = pendingReview?.photo;
    const action = pendingReview?.action;
    if (!photo?.id || !action || isMock) return;
    setReviewingPhotoId(photo.id);
    try {
      const result = await reviewCoachWeightPhoto(userId, photo.id, {
        action,
        rejectionReason: action === "rejected" ? rejectReason.trim() : "",
      });
      onToast?.(action === "approved" ? "Weight photo accepted" : "Weight photo rejected");
      if (result?.clientUpload) onClientUploadChange?.(result.clientUpload);
      setPendingReview(null);
      setRejectReason("");
      await onWeightAdded?.();
    } catch (err) {
      onToast?.(err.message || "Could not update the photo review");
    } finally {
      setReviewingPhotoId("");
    }
  }

  async function submitWeight(event) {
    event.preventDefault();
    const error = weightFieldError(weightValue, weightUnit);
    const weight = Number(weightValue);
    if (error || !Number.isFinite(weight) || weight <= 0 || String(weightValue).endsWith(".")) {
      onToast?.(error || `Enter a weight greater than 0 and at most ${limits.max} ${weightUnit}`);
      return;
    }
    if (!recordedDate || recordedDate > todayIsoDate()) {
      onToast?.("Date is required and cannot be in the future");
      return;
    }
    if (isMock) {
      onToast?.("Demo profiles cannot add weight entries.");
      return;
    }
    setSubmitting(true);
    try {
      await createCoachWeightLog(userId, {
        date: recordedDate,
        weight,
        unit: weightUnit,
        file: weightPhotoFile || undefined,
      });
      setWeightValue("");
      clearSelectedPhoto();
      onToast?.("Weight entry saved");
      await onWeightAdded?.();
    } catch (err) {
      onToast?.(err.message || "Could not save weight entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form className="ua-cp-hptrack-weight-form" onSubmit={submitWeight}>
        <button
          type="button"
          className={`ua-cp-hptrack-weight-form__pics${latestPhoto && !latestPhotoFailed ? " ua-cp-hptrack-weight-form__pics--has-photo" : ""}`}
          onClick={() => setHistoryOpen(true)}
        >
          {latestPhoto && !latestPhotoFailed ? (
            <>
              <img
                className="ua-cp-hptrack-weight-form__pics-img"
                src={latestPhoto.url}
                alt={`Latest weight photo from ${latestPhoto.date}`}
                onError={() => setLatestPhotoFailed(true)}
              />
              <span className="ua-cp-hptrack-weight-form__pics-overlay">
                <span className="ua-cp-hptrack-weight-form__pics-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <strong>View weight pics</strong>
                <span>{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
              </span>
            </>
          ) : (
            <>
              <span className="ua-cp-hptrack-weight-form__pics-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              <strong>View weight pics</strong>
              <span>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : "Tap to view history"}</span>
            </>
          )}
        </button>

        <div className="ua-cp-hptrack-weight-form__fields">
          <label className="ua-cp-hptrack-field">
            <span>Date</span>
            <div className="ua-cp-hptrack-date-field">
              <div className="ua-cp-hptrack-date-field__picker">
                <span className="ua-cp-hptrack-date-field__text">{formatDisplayDate(recordedDate)}</span>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="ua-cp-hptrack-date-field__input"
                  value={recordedDate}
                  max={todayIsoDate()}
                  onChange={(e) => {
                    const next = e.target.value || todayIsoDate();
                    const today = todayIsoDate();
                    setRecordedDate(next > today ? today : next);
                  }}
                  required
                />
              </div>
              <button
                type="button"
                className="ua-cp-hptrack-date-field__calendar"
                aria-label="Open date picker"
                onClick={openDatePicker}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="ua-cp-hptrack-date-field__file"
                onChange={onPhotoSelected}
              />
              <button
                type="button"
                className={`ua-cp-hptrack-date-field__camera${weightPhotoFile ? " ua-cp-hptrack-date-field__camera--active" : ""}`}
                aria-label={weightPhotoFile ? "Change weight photo" : "Add weight photo"}
                onClick={() => photoInputRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>
            {weightPhotoPreview ? (
              <div className="ua-cp-hptrack-date-field__preview">
                <img src={weightPhotoPreview} alt="Selected weight photo preview" />
                <button type="button" onClick={clearSelectedPhoto}>Remove photo</button>
              </div>
            ) : null}
          </label>

          <label className="ua-cp-hptrack-field" htmlFor="health-progress-weight">
            <span>Weight</span>
            <div className="ua-cp-hptrack-weight-input">
              <input
                id="health-progress-weight"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="--"
                maxLength={limits.maxLen}
                value={weightValue}
                onChange={onWeightChange}
                onKeyDown={blockInvalidWeightKeyDown}
                onBeforeInput={blockNonDecimalWeightBeforeInput}
                aria-invalid={Boolean(weightError)}
                aria-describedby={weightError ? "health-progress-weight-error" : "health-progress-weight-hint"}
                required
                className={weightError ? "is-invalid" : undefined}
              />
              <div className="ua-cp-hptrack-unit-toggle" role="group" aria-label="Weight unit">
                <button
                  type="button"
                  className={weightUnit === "kg" ? "ua-cp-hptrack-unit-toggle__btn--active" : ""}
                  aria-pressed={weightUnit === "kg"}
                  onClick={() => onWeightUnitChange("kg")}
                >
                  kg
                </button>
                <button
                  type="button"
                  className={weightUnit === "lbs" ? "ua-cp-hptrack-unit-toggle__btn--active" : ""}
                  aria-pressed={weightUnit === "lbs"}
                  onClick={() => onWeightUnitChange("lbs")}
                >
                  lbs
                </button>
              </div>
            </div>
            <span id="health-progress-weight-hint" className="ua-cp-hptrack-field__hint">
              Greater than 0, max {limits.max} {weightUnit}
            </span>
            {weightError ? (
              <span id="health-progress-weight-error" className="ua-cp-hptrack-field__error" role="alert">
                {weightError}
              </span>
            ) : null}
          </label>

          <button type="submit" className="ua-cp-btn ua-cp-hptrack-submit" disabled={submitting || isMock || !canSubmitWeight}>
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>

      <WeightPhotoHistoryModal
        open={historyOpen}
        photos={photos}
        canDelete={!isMock}
        deletingId={deletingPhotoId}
        reviewingId={reviewingPhotoId}
        onDelete={setPendingPhotoDelete}
        onReview={requestReview}
        onClose={() => {
          if (deletingPhotoId || reviewingPhotoId) return;
          setHistoryOpen(false);
        }}
      />

      <ConfirmModal
        open={Boolean(pendingPhotoDelete)}
        title={pendingPhotoDelete ? `Delete photo from ${pendingPhotoDelete.date}?` : "Delete photo?"}
        body="The photo will be removed from this weight entry. The weight reading itself stays in the history."
        confirmLabel={deletingPhotoId ? "Deleting…" : "Yes, delete it"}
        busy={Boolean(deletingPhotoId)}
        onClose={() => !deletingPhotoId && setPendingPhotoDelete(null)}
        onConfirm={confirmDeletePhoto}
      />

      <ConfirmModal
        open={Boolean(pendingReview)}
        tone={pendingReview?.action === "rejected" ? "danger" : "primary"}
        title={pendingReview?.action === "rejected"
          ? `Reject the photo from ${pendingReview.photo.date}?`
          : `Accept the photo from ${pendingReview?.photo?.date || "this date"}?`}
        body={pendingReview?.action === "rejected"
          ? "The photo stays on the entry and is marked rejected. Add a reason if the client should see why."
          : "The photo stays on the entry and is marked accepted."}
        confirmLabel={reviewingPhotoId
          ? "Saving…"
          : pendingReview?.action === "rejected" ? "Yes, reject it" : "Yes, accept it"}
        busy={Boolean(reviewingPhotoId)}
        onClose={() => {
          if (reviewingPhotoId) return;
          setPendingReview(null);
          setRejectReason("");
        }}
        onConfirm={confirmReview}
      >
        {pendingReview?.action === "rejected" ? (
          <label className="ua-cp-hptrack-weight-review-reason">
            Rejection reason
            <textarea
              rows={3}
              value={rejectReason}
              maxLength={500}
              placeholder="Optional"
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </label>
        ) : null}
      </ConfirmModal>

      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--orange">
        <div className="ua-cp-hptrack-chart-card__head ua-cp-hptrack-chart-card__head--blue">
          <strong>Client fatloss journey</strong>
          <select className="ua-cp-hptrack-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="4w">Last 4 weeks</option>
            <option value="8w">Last 8 weeks</option>
            <option value="12w">Last 12 weeks</option>
            <option value="all">All since onboarding</option>
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

function glucoseStatPhoto(latest, rows) {
  const ownUrl = glucosePhotoUrl(latest);
  if (ownUrl) return { url: ownUrl, caption: formatDisplayDateTime(imageStamp(latest)) };
  const older = [...rows].reverse().find((row) => glucosePhotoUrl(row));
  if (!older) return { url: "", caption: "" };
  return { url: glucosePhotoUrl(older), caption: formatDisplayDateTime(imageStamp(older)) };
}

function GlucosePanel({
  logs,
  hba1cReadings = [],
  userId,
  isMock,
  onToast,
  onLogsRefresh,
  onClientUploadChange,
}) {
  const [range, setRange] = useState("all");

  const uploadPhotos = useMemo(() => (
    collapseLogsByDate(sortByDateDesc(logs), "type", "glucosePicUrl")
      .filter((row) => row.glucosePicUrl)
      .map((row) => ({
        id: row.photoLogId || row.id || row._id,
        date: `${formatDisplayDateTime(imageStamp(row))}${row.type ? ` · ${String(row.type).toUpperCase()}` : ""}`,
        url: row.glucosePicUrl,
        reviewStatus: row.glucosePicReviewStatus || "pending",
        rejectionReason: row.glucosePicRejectionReason || "",
      }))
  ), [logs]);

  async function handleReviewed(result) {
    if (result?.clientUpload) onClientUploadChange?.(result.clientUpload);
    await onLogsRefresh?.();
  }

  const view = useMemo(() => {
    const daily = collapseLogsByDate(sortByDateAsc(logs), "type", "glucosePicUrl");
    const ranged = applyRange(daily, range);
    const fbs = daily.filter((row) => row.type === "fbs" && Number.isFinite(Number(row.value)));
    const ppbs = daily.filter((row) => row.type === "ppbs" && Number.isFinite(Number(row.value)));
    const latestFbs = fbs[fbs.length - 1];
    const firstFbs = fbs[0];
    const latestPpbs = ppbs[ppbs.length - 1];
    const firstPpbs = ppbs[0];
    const hba1c = applyRange(hba1cReadings, range);
    const latestHba1c = hba1cReadings[hba1cReadings.length - 1];
    const firstHba1c = hba1cReadings[0];

    const byDate = new Map();
    for (const row of ranged) {
      const key = calendarDateKey(row.recordedAt);
      if (!key) continue;
      const entry = byDate.get(key) || { date: formatChartDate(row.recordedAt), fbs: null, ppbs: null };
      if (row.type === "fbs") entry.fbs = Number(row.value);
      if (row.type === "ppbs") entry.ppbs = Number(row.value);
      byDate.set(key, entry);
    }
    const weekly = [...byDate.values()].slice(-8);
    const fbsPhoto = glucoseStatPhoto(latestFbs, fbs);
    const ppbsPhoto = glucoseStatPhoto(latestPpbs, ppbs);

    const stats = [{
      label: "HbA1c",
      value: latestHba1c ? `${latestHba1c.value} %` : "—",
      delta: hba1cReadings.length >= 2 ? deltaLabel(latestHba1c.value, firstHba1c.value, "") : "",
      latest: latestHba1c ? formatDisplayDate(latestHba1c.recordedAt) : "",
      note: latestHba1c ? "" : "No HbA1c on a blood report yet",
    }];
    if (latestFbs) {
      stats.push({
        label: "FBS",
        value: `${latestFbs.value} mg/dL`,
        delta: fbs.length >= 2 ? deltaLabel(Number(latestFbs.value), Number(firstFbs.value), "") : "",
        latest: formatDisplayDate(latestFbs.recordedAt),
        photoUrl: fbsPhoto.url,
        photoCaption: fbsPhoto.caption,
      });
    }
    if (latestPpbs) {
      stats.push({
        label: "PPBS",
        value: `${latestPpbs.value} mg/dL`,
        delta: ppbs.length >= 2 ? deltaLabel(Number(latestPpbs.value), Number(firstPpbs.value), "") : "",
        latest: formatDisplayDate(latestPpbs.recordedAt),
        photoUrl: ppbsPhoto.url,
        photoCaption: ppbsPhoto.caption,
      });
    }

    return {
      stats,
      hba1cDates: hba1c.map((row) => formatChartDate(row.recordedAt)).slice(-8),
      hba1cValues: hba1c.map((row) => row.value).slice(-8),
      weekly,
    };
  }, [logs, range, hba1cReadings]);

  if (!logs.length && !hba1cReadings.length) return <EmptyLogs label="glucose readings" />;

  return (
    <div className="ua-cp-hptrack-glucose">
      <UploadPhotoReviewSection
        title="Client glucose uploads"
        subtitle="Accept or reject each glucose panel photo. Rejecting opens client update again."
        photos={uploadPhotos}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        reviewPhoto={reviewCoachGlucosePhoto}
        onReviewed={handleReviewed}
      />
      <StatCards stats={view.stats} tone="red" />
      <div className="ua-cp-hptrack-chart-card ua-cp-hptrack-chart-card--red ua-cp-hptrack-glucose__charts">
        <div className="ua-cp-hptrack-glucose__section">
          <div className="ua-cp-hptrack-chart-card__head">
            <strong>HbA1c trend</strong>
            <span className="ua-cp-hptrack-chart-card__target">From blood reports · target &lt; 5.7 %</span>
          </div>
          {view.hba1cValues.length ? (
            <TrendLineChart dates={view.hba1cDates} values={view.hba1cValues} color="#d64545" />
          ) : (
            <p className="ua-cp-hptrack-empty">No HbA1c on a blood report yet.</p>
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

function BpPanel({ logs, userId, isMock, onToast, onLogsRefresh, onClientUploadChange }) {
  const [range, setRange] = useState("all");

  const uploadPhotos = useMemo(() => (
    collapseLogsByDate(sortByDateDesc(logs), "", "bpPicUrl")
      .filter((row) => row.bpPicUrl)
      .map((row) => ({
        id: row.photoLogId || row.id || row._id,
        date: formatDisplayDateTime(imageStamp(row)),
        url: row.bpPicUrl,
        reviewStatus: row.bpPicReviewStatus || "pending",
        rejectionReason: row.bpPicRejectionReason || "",
      }))
  ), [logs]);

  async function handleReviewed(result) {
    if (result?.clientUpload) onClientUploadChange?.(result.clientUpload);
    await onLogsRefresh?.();
  }
  const view = useMemo(() => {
    const filtered = collapseLogsByDate(applyRange(sortByDateAsc(logs), range), "", "bpPicUrl").filter((row) => (
      Number.isFinite(Number(row.sys)) && Number.isFinite(Number(row.dia))
    ));
    const latest = filtered[filtered.length - 1];
    const first = filtered[0];
    const photoRow = [...filtered].reverse().find((row) => row.bpPicUrl);
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
        photoUrl: photoRow?.bpPicUrl || "",
        photoCaption: photoRow ? formatDisplayDateTime(imageStamp(photoRow)) : "",
      },
      {
        label: "Readings logged",
        value: String(filtered.length),
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
      <UploadPhotoReviewSection
        title="Client blood pressure uploads"
        subtitle="Accept or reject each BP photo. Rejecting opens client update again."
        photos={uploadPhotos}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        reviewPhoto={reviewCoachBloodPressurePhoto}
        onReviewed={handleReviewed}
      />
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

function ConditionPanel({ logs, userId, isMock, onToast, onLogsRefresh, onClientUploadChange }) {
  const dailyLogs = useMemo(
    () => collapseLogsByDate(sortByDateDesc(logs), "", "picUrl"),
    [logs],
  );

  const uploadPhotos = useMemo(() => (
    dailyLogs
      .filter((row) => row.picUrl)
      .map((row) => ({
        id: row.photoLogId || row.id || row._id,
        date: `${formatDisplayDateTime(imageStamp(row))}${row.bodyPart ? ` · ${bodyPartLabel(row)}` : ""}`,
        url: row.picUrl,
        reviewStatus: row.picReviewStatus || "pending",
        rejectionReason: row.picRejectionReason || "",
      }))
  ), [dailyLogs]);

  async function handleReviewed(result) {
    if (result?.clientUpload) onClientUploadChange?.(result.clientUpload);
    await onLogsRefresh?.();
  }

  const groups = useMemo(() => {
    const map = new Map();
    for (const row of dailyLogs) {
      const key = String(row.bodyPart || "other").toLowerCase();
      const label = bodyPartLabel(row);
      const group = map.get(key) || { id: key, name: label, photos: [] };
      group.photos.push({
        id: row.id || row._id,
        date: formatDisplayDateTime(imageStamp(row)),
        url: row.picUrl || null,
        reviewStatus: row.picReviewStatus || "pending",
        rejectionReason: row.picRejectionReason || "",
      });
      map.set(key, group);
    }
    return [...map.values()];
  }, [dailyLogs]);

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
      <UploadPhotoReviewSection
        title="Client condition uploads"
        subtitle="Accept or reject each comparison photo. Rejecting opens client update again."
        photos={uploadPhotos}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        reviewPhoto={reviewCoachConditionPhoto}
        onReviewed={handleReviewed}
      />
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

function TrackerDetail({
  tracker,
  logs,
  hba1cReadings,
  userId,
  isMock,
  onToast,
  onWeightAdded,
  onLogsRefresh,
  onClientUploadChange,
}) {
  switch (tracker.id) {
    case "fatloss": return (
      <FatLossPanel
        logs={logs.weight}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        onWeightAdded={onWeightAdded}
        onClientUploadChange={onClientUploadChange}
      />
    );
    case "glucose": return (
      <GlucosePanel
        logs={logs.glucose}
        hba1cReadings={hba1cReadings}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        onLogsRefresh={() => onLogsRefresh?.("glucose")}
        onClientUploadChange={onClientUploadChange}
      />
    );
    case "menstrual": return <MenstrualPanel logs={logs.menstrual} />;
    case "bp": return (
      <BpPanel
        logs={logs.bp}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        onLogsRefresh={() => onLogsRefresh?.("bloodPressure")}
        onClientUploadChange={onClientUploadChange}
      />
    );
    case "condition": return (
      <ConditionPanel
        logs={logs.condition}
        userId={userId}
        isMock={isMock}
        onToast={onToast}
        onLogsRefresh={() => onLogsRefresh?.("conditionComparison")}
        onClientUploadChange={onClientUploadChange}
      />
    );
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
  const [hba1cReadings, setHba1cReadings] = useState([]);
  const [clientUpload, setClientUpload] = useState({});
  const [clientUploadBusyKey, setClientUploadBusyKey] = useState("");
  const [bulkClientUploadBusy, setBulkClientUploadBusy] = useState("");
  const loadedLogKeysRef = useRef(new Set());
  const { sessionUi } = useViewAs();
  const canOpenClientUpload = sessionUi === "admin" || sessionUi === "wc" || sessionUi === "awc";

  const liveCount = trackers.filter((t) => t.enabled).length;
  const enabledKey = trackers.filter((t) => t.enabled).map((t) => t.featureKey).filter(Boolean).sort().join(",");

  const filteredTrackers = useMemo(() => {
    let list = trackers;
    if (trackingFilter !== "all") list = list.filter((t) => t.id === trackingFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => `${t.name} ${t.category}`.toLowerCase().includes(q));
    }
    return list;
  }, [trackers, trackingFilter, search]);

  const enabledTrackers = useMemo(
    () => trackers.filter((t) => t.enabled),
    [trackers],
  );
  const clientUploadEligibleTrackers = useMemo(
    () => enabledTrackers.filter((t) => CLIENT_UPLOAD_FEATURE_KEYS.includes(t.featureKey)),
    [enabledTrackers],
  );
  const openClientUploadCount = useMemo(
    () => clientUploadEligibleTrackers.filter((t) => clientUpload[t.featureKey]?.open).length,
    [clientUploadEligibleTrackers, clientUpload],
  );
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
      setHba1cReadings([]);
      loadedLogKeysRef.current = new Set();
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    loadedLogKeysRef.current = new Set();
    setLogs(EMPTY_LOGS);
    setHba1cReadings([]);
    fetchHealthProgressSettings(userId)
      .then((result) => {
        if (cancelled || !result) return;
        setIsFemale(result.isFemale);
        setClientUpload(result.clientUpload || {});
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

    const enabledSet = new Set(enabledKey.split(",").filter(Boolean));
    const fetchers = [
      { key: "weightPic", logKey: "weight", enabled: enabledSet.has("weightPic"), load: () => fetchWeightLogs(userId) },
      { key: "glucose", logKey: "glucose", enabled: enabledSet.has("glucose"), load: () => fetchGlucoseLogs(userId) },
      { key: "bloodPressure", logKey: "bp", enabled: enabledSet.has("bloodPressure"), load: () => fetchBloodPressureLogs(userId) },
      { key: "menstrualCycle", logKey: "menstrual", enabled: enabledSet.has("menstrualCycle"), load: () => fetchMenstrualCycleLogs(userId) },
      { key: "conditionComparison", logKey: "condition", enabled: enabledSet.has("conditionComparison"), load: () => fetchConditionLogs(userId) },
    ];

    const toClear = fetchers.filter((row) => !row.enabled && loadedLogKeysRef.current.has(row.key));
    if (toClear.length) {
      toClear.forEach((row) => loadedLogKeysRef.current.delete(row.key));
      if (toClear.some((row) => row.logKey === "glucose")) setHba1cReadings([]);
      setLogs((prev) => {
        const next = { ...prev };
        toClear.forEach((row) => {
          next[row.logKey] = [];
        });
        return next;
      });
    }

    const toLoad = fetchers.filter((row) => row.enabled && !loadedLogKeysRef.current.has(row.key));
    if (!toLoad.length) return undefined;

    let cancelled = false;
    const isInitialLoad = loadedLogKeysRef.current.size === 0;
    // Reserve keys immediately so a second effect pass does not double-fetch.
    toLoad.forEach((row) => loadedLogKeysRef.current.add(row.key));
    if (isInitialLoad) setLogsLoading(true);

    Promise.all(toLoad.map((row) => {
      const requests = [row.load().then((rows) => rows || [])];
      if (row.logKey === "glucose") {
        requests.push(
          fetchUserLabReports(userId)
            .then((result) => hba1cReadingsFromReports(result?.reports))
            .catch(() => []),
        );
      }
      return Promise.all(requests).then(([rows, readings]) => ({
        logKey: row.logKey,
        key: row.key,
        rows,
        hba1cReadings: readings || null,
      }));
    }))
      .then((results) => {
        if (cancelled) {
          toLoad.forEach((row) => loadedLogKeysRef.current.delete(row.key));
          return;
        }
        const glucose = results.find((row) => row.logKey === "glucose" && row.hba1cReadings);
        if (glucose) setHba1cReadings(glucose.hba1cReadings);
        setLogs((prev) => {
          const next = { ...prev };
          results.forEach((row) => {
            next[row.logKey] = row.rows;
          });
          return next;
        });
      })
      .catch((err) => {
        toLoad.forEach((row) => loadedLogKeysRef.current.delete(row.key));
        if (!cancelled) onToast?.(err.message || "Could not load health progress logs");
      })
      .finally(() => {
        if (!cancelled && isInitialLoad) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isMock, loading, enabledKey, onToast]);

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
      onToast?.("Menstrual cycle is only available for girl clients");
      return;
    }
    const nextEnabled = !tracker.enabled;
    const scrollY = window.scrollY;
    setTrackers((list) => list.map((row) => (row.id === id ? { ...row, enabled: nextEnabled } : row)));
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY });
    });
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
        if (result.clientUpload) setClientUpload(result.clientUpload);
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
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY });
      });
    }
  }

  async function applyClientUploadPatch(updates, { successMessage, failureMessage }) {
    if (!canOpenClientUpload || isMock) {
      onToast?.("Only an admin, wellness coach, or assistant wellness coach can change client updates.");
      return;
    }
    const result = await patchHealthProgressClientUpload(userId, updates);
    if (result?.clientUpload) {
      setClientUpload(result.clientUpload);
      onToast?.(successMessage);
    } else {
      onToast?.(failureMessage);
    }
    return result;
  }

  async function openClientUpdate(featureKey) {
    setClientUploadBusyKey(featureKey);
    try {
      await applyClientUploadPatch(
        { [featureKey]: true },
        {
          successMessage: "Client update opened. It closes after the client saves or you close it.",
          failureMessage: "Client update could not be opened.",
        },
      );
    } catch (err) {
      onToast?.(err.message || "Could not open client update");
    } finally {
      setClientUploadBusyKey("");
    }
  }

  async function closeClientUpdate(featureKey) {
    setClientUploadBusyKey(featureKey);
    try {
      await applyClientUploadPatch(
        { [featureKey]: false },
        {
          successMessage: "Client update closed.",
          failureMessage: "Client update could not be closed.",
        },
      );
    } catch (err) {
      onToast?.(err.message || "Could not close client update");
    } finally {
      setClientUploadBusyKey("");
    }
  }

  async function openAllClientUpdates() {
    const updates = Object.fromEntries(
      clientUploadEligibleTrackers.map((tracker) => [tracker.featureKey, true]),
    );
    if (!Object.keys(updates).length) return;
    setBulkClientUploadBusy("open");
    try {
      await applyClientUploadPatch(updates, {
        successMessage: "Client update opened for all enabled trackers.",
        failureMessage: "Could not open client updates.",
      });
    } catch (err) {
      onToast?.(err.message || "Could not open client updates");
    } finally {
      setBulkClientUploadBusy("");
    }
  }

  async function closeAllClientUpdates() {
    const updates = Object.fromEntries(
      clientUploadEligibleTrackers
        .filter((tracker) => clientUpload[tracker.featureKey]?.open)
        .map((tracker) => [tracker.featureKey, false]),
    );
    if (!Object.keys(updates).length) return;
    setBulkClientUploadBusy("close");
    try {
      await applyClientUploadPatch(updates, {
        successMessage: "Client update closed for all open trackers.",
        failureMessage: "Could not close client updates.",
      });
    } catch (err) {
      onToast?.(err.message || "Could not close client updates");
    } finally {
      setBulkClientUploadBusy("");
    }
  }

  async function refreshWeightLogs() {
    if (!userId || isMock) return;
    try {
      const rows = await fetchWeightLogs(userId);
      setLogs((prev) => ({ ...prev, weight: rows || [] }));
    } catch (err) {
      onToast?.(err.message || "Could not refresh weight logs");
    }
  }

  async function refreshTrackerLogs(featureKey) {
    if (!userId || isMock) return;
    const loaders = {
      glucose: () => fetchGlucoseLogs(userId).then((rows) => ({ logKey: "glucose", rows: rows || [] })),
      bloodPressure: () => fetchBloodPressureLogs(userId).then((rows) => ({ logKey: "bp", rows: rows || [] })),
      conditionComparison: () => fetchConditionLogs(userId).then((rows) => ({ logKey: "condition", rows: rows || [] })),
    };
    const load = loaders[featureKey];
    if (!load) return;
    try {
      const { logKey, rows } = await load();
      setLogs((prev) => ({ ...prev, [logKey]: rows }));
    } catch (err) {
      onToast?.(err.message || "Could not refresh health progress logs");
    }
  }

  function applyClientUploadFromReview(nextUpload) {
    if (nextUpload && typeof nextUpload === "object") {
      setClientUpload(nextUpload);
    }
  }

  return (
    <div className="ua-cp-section ua-cp-hptrack">
      <div className="ua-cp-hptrack__head">
        <div>
          <h2 className="ua-cp-hptrack__title">Health Progress</h2>
          <p className="ua-cp-hptrack__sub">What this client is tracking. Enable a tracker to show it in their app.</p>
          <span className="ua-cp-hptrack__live">Trackers · {liveCount} of {trackers.length} live in app</span>
          <p className={`ua-cp-hptrack__status${error && !loading ? " ua-cp-hptrack__status--error" : ""}${!(loading || error || logsLoading) ? " is-empty" : ""}`}>
            {loading
              ? "Loading health progress…"
              : error
                ? error
                : logsLoading
                  ? "Loading tracker history…"
                  : "\u00a0"}
          </p>
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
        {canOpenClientUpload && clientUploadEligibleTrackers.length ? (
          <div className="ua-cp-hptrack-upload-bulk">
            <span className="ua-cp-hptrack-upload-bulk__label">
              Client updates · {openClientUploadCount} of {clientUploadEligibleTrackers.length} open
            </span>
            <div className="ua-cp-hptrack-upload-bulk__actions">
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                disabled={
                  loading
                  || Boolean(bulkClientUploadBusy)
                  || Boolean(clientUploadBusyKey)
                  || openClientUploadCount === clientUploadEligibleTrackers.length
                }
                onClick={openAllClientUpdates}
              >
                {bulkClientUploadBusy === "open" ? "Opening…" : "Open all enabled"}
              </button>
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                disabled={
                  loading
                  || Boolean(bulkClientUploadBusy)
                  || Boolean(clientUploadBusyKey)
                  || openClientUploadCount === 0
                }
                onClick={closeAllClientUpdates}
              >
                {bulkClientUploadBusy === "close" ? "Closing…" : "Close all open"}
              </button>
            </div>
          </div>
        ) : null}
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
                  <span> · {menstrualLocked ? "Girl clients only" : tracker.category}</span>
                  <ClientUploadControl
                    compact
                    featureKey={tracker.featureKey}
                    window={clientUpload[tracker.featureKey]}
                    canEnable={canOpenClientUpload}
                    trackerEnabled={tracker.enabled}
                    busy={clientUploadBusyKey === tracker.featureKey || Boolean(bulkClientUploadBusy)}
                    onOpen={openClientUpdate}
                    onClose={closeClientUpdate}
                  />
                </div>
                <span className={`ua-cp-hptrack-list__status${tracker.enabled ? "" : " is-off"}`}>
                  Live in app
                </span>
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
            <ClientUploadControl
              featureKey={tracker.featureKey}
              window={clientUpload[tracker.featureKey]}
              canEnable={canOpenClientUpload}
              trackerEnabled={tracker.enabled}
              busy={clientUploadBusyKey === tracker.featureKey || Boolean(bulkClientUploadBusy)}
              onOpen={openClientUpdate}
              onClose={closeClientUpdate}
            />
            <TrackerDetail
              tracker={tracker}
              logs={logs}
              hba1cReadings={hba1cReadings}
              userId={userId}
              isMock={isMock}
              onToast={onToast}
              onWeightAdded={refreshWeightLogs}
              onLogsRefresh={refreshTrackerLogs}
              onClientUploadChange={applyClientUploadFromReview}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
