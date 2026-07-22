import {
  computePeriodStats,
  dayProgressPercent,
  formatCompactCount,
  formatFullCount,
} from "./trackingHistoryStats.js";
import { formatDate } from "../admin/utils/formatDate.js";

function shortDateLabel(dateOnly) {
  if (!dateOnly) return "—";
  const formatted = formatDate(`${dateOnly}T00:00:00.000Z`, { timeZone: "UTC" });
  if (formatted === "—") return dateOnly;
  return formatted.replace(/\s+\d{4}$/, "");
}

export function TrackingHistorySummary({ stats, unitLabel, valueLabel = "Total", totalHint }) {
  if (!stats) return null;

  return (
    <div className="tracking-summary">
      <div className="tracking-summary__card">
        <span className="tracking-summary__label">{valueLabel}</span>
        <strong className="tracking-summary__value">{formatFullCount(stats.total)}</strong>
        <span className="tracking-summary__hint">{totalHint || unitLabel}</span>
      </div>
      <div className="tracking-summary__card">
        <span className="tracking-summary__label">Goals completed</span>
        <strong className="tracking-summary__value">
          {stats.daysGoalMet}
          <span className="tracking-summary__value-suffix"> / {stats.totalDays}</span>
        </strong>
        <span className="tracking-summary__hint">days at or above goal</span>
      </div>
      <div className="tracking-summary__card">
        <span className="tracking-summary__label">Daily average</span>
        <strong className="tracking-summary__value">{formatFullCount(stats.averagePerDay)}</strong>
        <span className="tracking-summary__hint">
          {stats.activeDays > 0
            ? `${formatFullCount(stats.averageActiveDay)} on active days`
            : "no activity yet"}
        </span>
      </div>
      <div className="tracking-summary__card">
        <span className="tracking-summary__label">Period progress</span>
        <strong className="tracking-summary__value">{stats.overallPercent}%</strong>
        <span className="tracking-summary__hint">of combined daily goals</span>
      </div>
    </div>
  );
}

export function TrackingBarChart({
  rows = [],
  getValue,
  getGoal,
  formatValue = (n) => String(n),
  barClassName = "",
  valueLabel = "Value",
  goalLabel = "Daily goal",
  unitLabel = "",
  totalHint = "",
  emptyMessage = "No records to chart in this range.",
  showSummary = true,
}) {
  if (!rows.length) {
    return <p className="tracking-chart__empty">{emptyMessage}</p>;
  }

  const values = rows.map((row) => Math.max(0, Number(getValue(row)) || 0));
  const goals = rows.map((row) => Math.max(0, Number(getGoal(row)) || 0));
  const referenceGoal = Math.max(...goals, 1);
  const stats = computePeriodStats(rows, getValue, getGoal);
  const compactPlot = rows.length <= 14;

  return (
    <div className="tracking-chart">
      {showSummary ? (
        <TrackingHistorySummary
          stats={stats}
          unitLabel={unitLabel}
          totalHint={totalHint}
          valueLabel={`Total ${valueLabel.toLowerCase()}`}
        />
      ) : null}

      <div className="tracking-chart__layout">
        <div className="tracking-chart__y-axis" aria-hidden="true">
          <span className="tracking-chart__y-tick tracking-chart__y-tick--top">
            {formatFullCount(referenceGoal)}
          </span>
          <span className="tracking-chart__y-tick">{formatFullCount(Math.round(referenceGoal / 2))}</span>
          <span className="tracking-chart__y-tick tracking-chart__y-tick--bottom">0</span>
        </div>

        <div
          className={`tracking-chart__plot${compactPlot ? " tracking-chart__plot--compact" : ""}`}
          role="img"
          aria-label={`${valueLabel} bar chart`}
        >
          {rows.map((row, index) => {
            const value = values[index];
            const goal = goals[index] || referenceGoal;
            const progress = dayProgressPercent(value, goal);
            const heightPct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
            const goalMet = goal > 0 && value >= goal;
            const hasActivity = value > 0;
            const title = `${shortDateLabel(row.date)}: ${formatValue(value)}${
              goal > 0 ? ` (${progress}% of ${formatValue(goal)} goal)` : ""
            }`;

            return (
              <div
                className={`tracking-chart__column${hasActivity ? " tracking-chart__column--active" : ""}${
                  goalMet ? " tracking-chart__column--met" : ""
                }`}
                key={row.date || index}
              >
                <div className="tracking-chart__bar-wrap">
                  <div className="tracking-chart__bar-track" aria-hidden="true" />
                  <div className="tracking-chart__goal-line" title={`${goalLabel}: ${formatValue(goal)}`} />
                  {hasActivity && compactPlot ? (
                    <span
                      className={`tracking-chart__value-label${goalMet ? " tracking-chart__value-label--met" : ""}`}
                      style={{ bottom: `calc(${Math.max(heightPct, 8)}% + 6px)` }}
                    >
                      {formatFullCount(value)}
                    </span>
                  ) : null}
                  {hasActivity ? (
                    <div
                      className={`tracking-chart__bar ${barClassName}${
                        goalMet ? " tracking-chart__bar--goal-met" : ""
                      }`.trim()}
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                      title={title}
                    />
                  ) : (
                    <div className="tracking-chart__bar tracking-chart__bar--zero" title={title} aria-hidden="true" />
                  )}
                </div>
                {!compactPlot && hasActivity ? (
                  <span className="tracking-chart__count">{formatCompactCount(value)}</span>
                ) : null}
                <span
                  className={`tracking-chart__pct${
                    goalMet ? " tracking-chart__pct--met" : hasActivity ? "" : " tracking-chart__pct--empty"
                  }`}
                >
                  {hasActivity ? `${progress}%` : "0"}
                </span>
                <span className="tracking-chart__label">{shortDateLabel(row.date)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tracking-chart__legend">
        <span className="tracking-chart__legend-item">
          <span className={`tracking-chart__swatch ${barClassName}`.trim()} aria-hidden="true" />
          {valueLabel}
        </span>
        <span className="tracking-chart__legend-item">
          <span className="tracking-chart__swatch tracking-chart__swatch--goal" aria-hidden="true" />
          {goalLabel} (100%)
        </span>
        <span className="tracking-chart__legend-item">
          <span className="tracking-chart__swatch tracking-chart__swatch--met" aria-hidden="true" />
          Goal completed
        </span>
      </div>
    </div>
  );
}
