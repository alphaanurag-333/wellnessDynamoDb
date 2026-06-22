function formatDateLabel(dateOnly) {
  if (!dateOnly) return "—";
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dateOnly;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function progressPercent(stepCount, goalSteps) {
  const goal = Number(goalSteps);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  const count = Number(stepCount) || 0;
  return Math.min(100, Math.round((count / goal) * 100));
}

function formatSource(source) {
  const value = String(source || "unknown").toLowerCase();
  if (value === "health_connect") return "Health Connect";
  if (value === "healthkit") return "HealthKit";
  if (value === "manual") return "Manual";
  return "Unknown";
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

export function StepsTrackingHistoryPanel({
  title = "Steps tracking history",
  subtitle,
  user,
  settings,
  history,
  range,
  connections,
  loading,
  error,
  days,
  onDaysChange,
  onBack,
}) {
  const goalSteps = settings?.goalSteps ?? 0;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        {onBack ? (
          <button type="button" className="user-back-btn" aria-label="Back" onClick={onBack}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </button>
        ) : null}
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">{title}</h2>
          {subtitle ? <p className="page-card__subtitle">{subtitle}</p> : null}
          {user ? (
            <p className="page-card__subtitle">
              {user.name || "User"} {user.email ? `· ${user.email}` : ""}
            </p>
          ) : null}
        </div>
        {onDaysChange ? (
          <div className="user-page__toolbar-actions">
            <label className="user-field user-field--inline">
              <span className="user-field__label">Days</span>
              <select
                className="user-field__input"
                value={String(days)}
                onChange={(e) => onDaysChange(Number(e.target.value))}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="page-card">
          <p>Loading steps tracking history…</p>
        </div>
      ) : (
        <>
          <div className="page-card user-view-card">
            <div className="user-view-grid user-view-grid--compact">
              <div className="user-detail-row">
                <span className="user-detail-row__label">Daily goal</span>
                <span className="user-detail-row__value">{formatNumber(goalSteps)} steps</span>
              </div>
              {range?.startDate && range?.endDate ? (
                <div className="user-detail-row">
                  <span className="user-detail-row__label">Date range</span>
                  <span className="user-detail-row__value">
                    {formatDateLabel(range.startDate)} – {formatDateLabel(range.endDate)}
                  </span>
                </div>
              ) : null}
              {connections ? (
                <>
                  <div className="user-detail-row">
                    <span className="user-detail-row__label">Android</span>
                    <span className="user-detail-row__value">
                      {connections.android?.connected
                        ? `${connections.android.provider || "Connected"}${connections.android.lastSyncedAt ? ` · ${formatDateLabel(String(connections.android.lastSyncedAt).slice(0, 10))}` : ""}`
                        : "Not connected"}
                    </span>
                  </div>
                  <div className="user-detail-row">
                    <span className="user-detail-row__label">iOS</span>
                    <span className="user-detail-row__value">
                      {connections.ios?.connected
                        ? `${connections.ios.provider || "Connected"}${connections.ios.lastSyncedAt ? ` · ${formatDateLabel(String(connections.ios.lastSyncedAt).slice(0, 10))}` : ""}`
                        : "Not connected"}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="page-card">
            <div className="page-card__head">
              <h3 className="page-card__title">Daily activity</h3>
              <p className="page-card__subtitle">Day-wise steps, distance, and progress toward goal.</p>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Steps</th>
                    <th>Goal</th>
                    <th>Distance</th>
                    <th>Calories</th>
                    <th>Source</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No steps tracking records in this range.</td>
                    </tr>
                  ) : (
                    [...history].reverse().map((row) => {
                      const pct = progressPercent(row.stepCount, row.goalSteps);
                      return (
                        <tr key={row.date}>
                          <td>{formatDateLabel(row.date)}</td>
                          <td>{row.day || "—"}</td>
                          <td>
                            <strong>{formatNumber(row.stepCount ?? 0)}</strong>
                          </td>
                          <td>{formatNumber(row.goalSteps ?? "—")}</td>
                          <td>{row.distanceKm != null ? `${row.distanceKm} km` : "—"}</td>
                          <td>{row.caloriesKcal != null ? `${row.caloriesKcal} kcal` : "—"}</td>
                          <td>{formatSource(row.source)}</td>
                          <td>
                            <div className="steps-progress-cell">
                              <div className="steps-progress-bar" aria-hidden="true">
                                <span className="steps-progress-bar__fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="steps-progress-cell__label">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        .user-view-grid--compact { margin-top: 0; }
        .user-field--inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }
        .user-field--inline .user-field__label { margin: 0; white-space: nowrap; }
        .user-field--inline .user-field__input { min-width: 9rem; }
        .steps-progress-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 8rem;
        }
        .steps-progress-bar {
          flex: 1;
          height: 0.5rem;
          background: #e8eef5;
          border-radius: 999px;
          overflow: hidden;
        }
        .steps-progress-bar__fill {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #86efac, #16a34a);
          border-radius: 999px;
        }
        .steps-progress-cell__label {
          font-size: 0.8rem;
          color: #5b6b7c;
          min-width: 2.5rem;
        }
      `}</style>
    </div>
  );
}
