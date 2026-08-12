import { useState } from "react";
import { BODY_ANALYTICS, PHOTO_ANGLES } from "../../data/bodyAnalyticsData.js";

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

function HistoryTable({ title, columns, rows, unitToggle }) {
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
              <th>{columns[0]}</th>
              {columns.slice(1).map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th className="ua-cp-ba-table__delta">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="ua-cp-ba-table__label">{row.label}</td>
                {row.values.map((val, i) => (
                  <td key={i}>{val}</td>
                ))}
                <td className={`ua-cp-ba-table__delta ua-cp-ba-table__delta--${row.tone}`}>{row.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PhotoCards({ onOpen }) {
  return (
    <section className="ua-cp-ba-block">
      <div className="ua-cp-ba-block__head">
        <h3 className="ua-cp-ba-block__title">Progress photos · 3 angles</h3>
        <span className="ua-cp-ba-block__meta">Latest: {BODY_ANALYTICS.latestPhotoDate}</span>
      </div>
      <div className="ua-cp-ba-photos">
        {PHOTO_ANGLES.map((angle) => (
          <button key={angle} type="button" className="ua-cp-ba-photo cdact" onClick={() => onOpen(angle)}>
            <span className="ua-cp-ba-photo__icon" aria-hidden="true">📷</span>
            <span className="ua-cp-ba-photo__label">{angle}</span>
            <span className="ua-cp-ba-photo__hint">Tap to view all</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PhotoModal({ angle, photos, onClose, onToast }) {
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
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
            <div key={p.date} className="ua-cp-ba-photo-card">
              <div className="ua-cp-ba-photo-card__img">
                <span aria-hidden="true">📷</span>
                <span>{angle}</span>
              </div>
              <div className="ua-cp-ba-photo-card__foot">
                <span>{p.date}</span>
                <button type="button" className="ua-cp-ba-photo-card__save" onClick={() => onToast(`Saved ${angle} photo (${p.date})`)}>
                  ↓ Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BodyAnalyticsSection({ onToast }) {
  const [historyMode, setHistoryMode] = useState("weekly");
  const [period, setPeriod] = useState(BODY_ANALYTICS.weeklyOptions[0]);
  const [unit, setUnit] = useState("cm");
  const [photoAngle, setPhotoAngle] = useState(null);

  const isWeekly = historyMode === "weekly";
  const periods = isWeekly ? BODY_ANALYTICS.weeklyPeriods : BODY_ANALYTICS.monthlyPeriods;
  const periodOptions = isWeekly ? BODY_ANALYTICS.weeklyOptions : BODY_ANALYTICS.monthlyOptions;
  const measureKey = isWeekly ? "weekly" : "monthly";
  const measureRows = BODY_ANALYTICS.measurements[measureKey][unit];
  const metabolicRows = BODY_ANALYTICS.metabolic[measureKey];
  const measureCol = isWeekly ? "MEASURE" : "MEASURE";
  const metricCol = "METRIC";

  function onHistoryChange(mode) {
    setHistoryMode(mode);
    setPeriod(mode === "weekly" ? BODY_ANALYTICS.weeklyOptions[0] : BODY_ANALYTICS.monthlyOptions[0]);
  }

  const unitToggle = (
    <SegToggle
      size="xs"
      value={unit}
      onChange={setUnit}
      options={[{ id: "cm", label: "cm" }, { id: "inch", label: "inch" }]}
    />
  );

  return (
    <div className="ua-cp-section ua-cp-body-analytics">
      <div className="ua-cp-ba-head">
        <div>
          <h2 className="ua-cp-ba-head__title">Body analytics</h2>
          <p className="ua-cp-ba-head__hint">{BODY_ANALYTICS.weeklyHint}</p>
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
          >
            {periodOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <PhotoCards onOpen={setPhotoAngle} />

      <HistoryTable
        title="Body measurements · history"
        columns={[measureCol, ...periods]}
        rows={measureRows}
        unitToggle={unitToggle}
      />

      <HistoryTable
        title="Metabolic health metrics · history"
        columns={[metricCol, ...periods]}
        rows={metabolicRows}
      />

      {photoAngle ? (
        <PhotoModal
          angle={photoAngle}
          photos={BODY_ANALYTICS.photos[photoAngle]}
          onClose={() => setPhotoAngle(null)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}
