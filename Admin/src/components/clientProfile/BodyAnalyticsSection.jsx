import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchUserBodyAnalytics } from "../../api/usersApi.js";
import {
  BODY_ANALYTICS,
  PHOTO_ANGLES,
  buildPhotosByAngle,
  buildMeasurementRows,
  buildMetabolicRows,
  formatHistoryColumns,
  formatPhotoDate,
  getHistoryWindow,
  getPeriodOptions,
} from "../../data/bodyAnalyticsData.js";

function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer") || document.querySelector(".updated-admin");
}

function SegToggle({ options, value, onChange, size = "sm" }) {
  return (
    <div className={`ua-cp-seg ua-cp-seg--${size}`} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ua-cp-seg__btn${value === opt.id ? " ua-cp-seg__btn--active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DeltaCell({ value, tone }) {
  if (tone === "bad") {
    return <span className="ua-cp-ba-table__delta-pill ua-cp-ba-table__delta-pill--bad">{value}</span>;
  }
  return value;
}

function HistoryTable({ title, labelCol, columns, rows, unitToggle }) {
  return (
    <section className="ua-cp-ba-block">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">{title}</h3>
        {unitToggle}
      </div>
      <div className="ua-cp-ba-table-wrap">
        <table className="ua-cp-ba-table">
          <thead>
            <tr>
              <th className="ua-cp-ba-table__label-col">{labelCol}</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th className="ua-cp-ba-table__delta-col">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="ua-cp-ba-table__label">{row.label}</td>
                {row.values.map((val, i) => (
                  <td key={`${row.label}-${i}`}>{val}</td>
                ))}
                <td className={`ua-cp-ba-table__delta ua-cp-ba-table__delta--${row.tone}`}>
                  <DeltaCell value={row.delta} tone={row.tone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PhotoCards({ photosByAngle, latestPhotoDate, onOpen }) {
  return (
    <section className="ua-cp-ba-block ua-cp-ba-block--photos">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">Progress photos · 3 angles</h3>
        <span className="ua-cp-ba-block__meta">Latest: {latestPhotoDate}</span>
      </div>
      <div className="ua-cp-ba-photos">
        {PHOTO_ANGLES.map((angle) => (
          <button
            key={angle.label}
            type="button"
            className="ua-cp-ba-photo"
            onClick={() => onOpen(angle.label)}
            disabled={!photosByAngle[angle.label]?.length}
          >
            <span className="ua-cp-ba-photo__icon" aria-hidden="true">📷</span>
            <span className="ua-cp-ba-photo__label">{angle.label}</span>
            <span className="ua-cp-ba-photo__hint">
              {photosByAngle[angle.label]?.length
                ? `${photosByAngle[angle.label].length} photo${photosByAngle[angle.label].length === 1 ? "" : "s"} · tap to view`
                : "No photo uploaded"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PhotoModal({ angle, photos, onClose, onToast }) {
  const root = getModalRoot();
  if (!root) return null;

  return createPortal(
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cp-modal ua-cp-modal--photos" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="photo-modal-title">
        <div className="ua-cp-modal__head ua-cp-modal__head--photos">
          <div>
            <div id="photo-modal-title" className="ua-cp-modal__title">{angle} Photos</div>
            <div className="ua-cp-modal__sub">All {angle} photos uploaded by the client — compare over time</div>
          </div>
          <div className="ua-cp-modal__actions">
            <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={() => onToast(`Downloading all ${angle} photos`)}>
              ↓ Download all
            </button>
            <button type="button" className="ua-cp-modal__close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div className="ua-cp-ba-photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="ua-cp-ba-photo-card">
              <div className="ua-cp-ba-photo-card__img">
                <img src={p.url} alt={`${angle} progress from ${p.date}`} />
              </div>
              <div className="ua-cp-ba-photo-card__foot">
                <span>{p.date}</span>
                <a
                  className="ua-cp-ba-photo-card__save"
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  onClick={() => onToast(`Opened ${angle} photo (${p.date})`)}
                >
                  ↓ Save
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    root,
  );
}

export function BodyAnalyticsSection({ user, onToast }) {
  const [historyMode, setHistoryMode] = useState("monthly");
  const [period, setPeriod] = useState("");
  const [unit, setUnit] = useState("cm");
  const [photoAngle, setPhotoAngle] = useState(null);
  const [bodyAnalytics, setBodyAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const isWeekly = historyMode === "weekly";
  const periodOptions = useMemo(
    () => getPeriodOptions(bodyAnalytics, historyMode),
    [bodyAnalytics, historyMode],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetchUserBodyAnalytics(user?.id)
      .then((data) => {
        if (!cancelled) setBodyAnalytics(data);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error?.message || "Failed to load body analytics";
        setLoadError(message);
        onToast?.(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onToast, user?.id]);

  useEffect(() => {
    setPeriod(periodOptions[0] || "");
  }, [periodOptions]);

  const historyWindow = useMemo(
    () => getHistoryWindow(periodOptions, period),
    [period, periodOptions],
  );

  const historyColumns = useMemo(
    () => formatHistoryColumns(historyMode, historyWindow),
    [historyMode, historyWindow],
  );

  const measureRows = useMemo(
    () => buildMeasurementRows(bodyAnalytics?.measurements, historyMode, unit, historyWindow),
    [bodyAnalytics?.measurements, historyMode, historyWindow, unit],
  );

  const metabolicRows = useMemo(
    () => buildMetabolicRows(bodyAnalytics?.metabolicMetrics, historyMode, historyWindow),
    [bodyAnalytics?.metabolicMetrics, historyMode, historyWindow],
  );

  function onHistoryChange(mode) {
    setHistoryMode(mode);
  }

  const photosByAngle = useMemo(
    () => buildPhotosByAngle(bodyAnalytics?.photos),
    [bodyAnalytics?.photos],
  );
  const latestPhotoDate = formatPhotoDate(bodyAnalytics?.photos?.[0]?.recordedAt);

  const unitToggle = (
    <SegToggle
      size="xs"
      value={unit}
      onChange={setUnit}
      options={[{ id: "cm", label: "cm" }, { id: "inch", label: "inch" }]}
    />
  );

  if (loading) {
    return <div className="ua-cp-section ua-cp-body-analytics"><p className="ua-page-head__sub">Loading body analytics…</p></div>;
  }

  if (loadError) {
    return <div className="ua-cp-section ua-cp-body-analytics"><p className="ua-page-head__sub" style={{ color: "#b42318" }}>{loadError}</p></div>;
  }

  return (
    <div className="ua-cp-section ua-cp-body-analytics">
      <div className="ua-cp-ba-head">
        <div>
          <h2 className="ua-cp-ba-head__title">Body analytics</h2>
          <p className="ua-cp-ba-head__hint">
            {isWeekly ? BODY_ANALYTICS.weeklyHint : BODY_ANALYTICS.monthlyHint}
          </p>
        </div>
        <div className="ua-cp-ba-head__controls">
          <span className="ua-cp-ba-head__history-label">History</span>
          <SegToggle
            value={historyMode}
            onChange={onHistoryChange}
            options={[{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }]}
          />
          <select
            className="ua-cp-ba-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="History period"
            disabled={!periodOptions.length}
          >
            {!periodOptions.length ? <option value="">No records</option> : null}
            {periodOptions.map((opt) => (
              <option key={opt} value={opt}>{formatHistoryColumns(historyMode, [opt])[0]}</option>
            ))}
          </select>
        </div>
      </div>

      <PhotoCards
        photosByAngle={photosByAngle}
        latestPhotoDate={latestPhotoDate}
        onOpen={setPhotoAngle}
      />

      <HistoryTable
        title="Body measurements · history"
        labelCol="Measure"
        columns={historyColumns}
        rows={measureRows}
        unitToggle={unitToggle}
      />

      <HistoryTable
        title="Metabolic health metrics · history"
        labelCol="Metric"
        columns={historyColumns}
        rows={metabolicRows}
      />

      {photoAngle ? (
        <PhotoModal
          angle={photoAngle}
          photos={photosByAngle[photoAngle] || []}
          onClose={() => setPhotoAngle(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}
