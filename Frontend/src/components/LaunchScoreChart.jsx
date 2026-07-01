import { useMemo, useState } from "react";
import {
  formatAssessmentDate,
  formatAssessmentDateRange,
  filterHistoryByDateRange,
  getEarliestAssessmentDate,
  getLaunchHistoryPeriodWindow,
  getLaunchScoreZone,
  LAUNCH_HISTORY_DEFAULT_DAYS,
  LAUNCH_HISTORY_PERIOD_OPTIONS,
  LAUNCH_MAX_REFERENCE_SCORE,
  todayDateInputValue,
} from "./launchAssessmentShared.js";

function shortDateLabel(dateOnly) {
  return formatAssessmentDate(dateOnly);
}

export function LaunchScoreGauge({ score, maxScore = LAUNCH_MAX_REFERENCE_SCORE }) {
  const zone = getLaunchScoreZone(score);
  const pct = Math.min(100, Math.max(0, Math.round(((Number(score) || 0) / maxScore) * 100)));

  return (
    <div className="launch-gauge">
      <div className="launch-gauge__score-box" style={{ backgroundColor: zone.color }}>
        <span className="launch-gauge__score-value">{Number(score) || 0}</span>
        <span className="launch-gauge__score-label">Lifestyle Score</span>
      </div>
      <div className="launch-gauge__track" aria-hidden="true">
        <div className="launch-gauge__zones">
          <span style={{ background: "#ef4444" }} />
          <span style={{ background: "#f97316" }} />
          <span style={{ background: "#eab308" }} />
          <span style={{ background: "#84cc16" }} />
          <span style={{ background: "#16a34a" }} />
        </div>
        <div className="launch-gauge__needle" style={{ left: `${pct}%` }} />
      </div>
      <p className="launch-gauge__zone-label">
        {zone.emoji} {zone.label}
      </p>
    </div>
  );
}

export function LaunchScoreHistoryChart({ history = [], maxScore = LAUNCH_MAX_REFERENCE_SCORE }) {
  const today = todayDateInputValue();
  const earliestDate = useMemo(() => getEarliestAssessmentDate(history), [history]);
  const [periodDays, setPeriodDays] = useState(LAUNCH_HISTORY_DEFAULT_DAYS);

  const { rangeStart, rangeEnd } = useMemo(
    () => getLaunchHistoryPeriodWindow(periodDays, { anchorEnd: today, earliestDate }),
    [earliestDate, periodDays, today]
  );

  const rows = useMemo(
    () => filterHistoryByDateRange(history, rangeStart, rangeEnd),
    [history, rangeEnd, rangeStart]
  );

  const rangeLabel = formatAssessmentDateRange(rangeStart, rangeEnd);
  const periodLabel =
    LAUNCH_HISTORY_PERIOD_OPTIONS.find((o) => o.value === periodDays)?.label || "Selected period";
  const summaryText =
    rows.length > 0
      ? `${rows.length} assessment${rows.length === 1 ? "" : "s"} · ${rangeLabel}`
      : `${periodLabel} · ${rangeLabel}`;

  if (!history.length) {
    return <p className="tracking-chart__empty">No assessment scores yet. Save the first assessment to see progress.</p>;
  }

  return (
    <div className="launch-history-chart">
      <div className="tracking-history-card__head launch-history-chart__head">
        <div className="tracking-history-card__head-text">
          <h3 className="launch-assessment-page__section-title">Score history</h3>
          <p className="page-card__subtitle launch-history-chart__subtitle">{summaryText}</p>
        </div>
        <label className="user-field launch-history-chart__period">
          <span className="user-field__label">Period</span>
          <select
            className="user-field__input"
            value={String(periodDays)}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            aria-label="Score history period"
          >
            {LAUNCH_HISTORY_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="tracking-chart__empty launch-history-chart__empty-window">
          No scores in the selected period.
        </p>
      ) : (
        <div
          className="launch-history-chart__plot"
          role="img"
          aria-label={`LAUNCH score history, ${summaryText}`}
        >
          {rows.map((row) => {
            const score = Number(row.totalScore) || 0;
            const zone = getLaunchScoreZone(score);
            const heightPct = Math.min(100, Math.max(8, Math.round((score / maxScore) * 100)));
            return (
              <div className="launch-history-chart__column" key={row.id || row.assessmentDate}>
                <span className="launch-history-chart__value">{score}</span>
                <div className="launch-history-chart__bar-wrap">
                  <div
                    className="launch-history-chart__bar"
                    style={{ height: `${heightPct}%`, backgroundColor: zone.color }}
                    title={`${shortDateLabel(row.assessmentDate)}: ${score}`}
                  />
                </div>
                <span className="launch-history-chart__label">{shortDateLabel(row.assessmentDate)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
