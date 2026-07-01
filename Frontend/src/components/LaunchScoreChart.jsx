import { formatAssessmentDate, getLaunchScoreZone, LAUNCH_MAX_REFERENCE_SCORE } from "./launchAssessmentShared.js";

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
  if (!history.length) {
    return <p className="tracking-chart__empty">No assessment scores yet. Save the first assessment to see progress.</p>;
  }

  const rows = [...history].sort((a, b) =>
    String(a.assessmentDate || "").localeCompare(String(b.assessmentDate || ""))
  );

  return (
    <div className="launch-history-chart">
      <div className="launch-history-chart__plot" role="img" aria-label="LAUNCH score history">
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
    </div>
  );
}
