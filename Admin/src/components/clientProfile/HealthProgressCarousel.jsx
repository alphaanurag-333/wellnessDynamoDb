import { useState } from "react";
import { getHealthPrograms } from "../../data/healthProgressData.js";

function InsightCell({ item }) {
  const toneClass = item.tone ? ` ua-cp-prog-ins__cell--${item.tone}` : "";
  const highlightClass = item.highlight ? " ua-cp-prog-ins__cell--highlight" : "";
  return (
    <div className={`ua-cp-prog-ins__cell${toneClass}${highlightClass}`}>
      <div className="ua-cp-prog-ins__cell-label">{item.label}</div>
      <div className="ua-cp-prog-ins__cell-val">{item.val}</div>
    </div>
  );
}

function ProgramCard({ program, onOpen }) {
  const isBar = program.layout === "bar";

  return (
    <button
      type="button"
      className="ua-cp-prog-card pgcard"
      style={{ background: program.soft }}
      onClick={() => onOpen?.(program.id)}
    >
      <span className="ua-cp-prog-card__icon" style={{ background: program.iconBg }}>
        <span className={`pgi ${program.iconClass}`}>{program.icon}</span>
      </span>
      <div className="ua-cp-prog-card__copy">
        <div className="ua-cp-prog-card__title-row">
          {program.titleSplit ? (
            <span className="ua-cp-prog-card__name ua-cp-prog-card__name--split">
              <span>{program.name}</span>
              <span className="ua-cp-prog-card__metric">{program.metric}</span>
            </span>
          ) : (
            <>
              <span className="ua-cp-prog-card__name">{program.name}</span>
              <span className="ua-cp-prog-card__metric">{program.metric}</span>
            </>
          )}
        </div>
        {isBar ? (
          <>
            {program.current ? (
              <div className="ua-cp-health-progress__value" style={{ color: program.accent }}>
                {program.current}
              </div>
            ) : null}
            <div className="ua-cp-prog-card__bar">
              <span style={{ width: `${program.barPct}%`, background: program.accent }}>{program.barLabel}</span>
            </div>
            {program.status ? (
              <div className={`ua-cp-prog-card__status ua-cp-prog-card__status--${program.statusTone || "muted"}`}>
                {program.status}
              </div>
            ) : null}
          </>
        ) : (
          <div className="ua-cp-prog-card__values">
            <span className="ua-cp-prog-card__current" style={{ color: program.accent }}>{program.current}</span>
            {program.val ? <span className="ua-cp-prog-card__val">{program.val}</span> : null}
            {program.delta ? (
              <span className={`ua-cp-prog-card__delta ua-cp-prog-card__delta--${program.deltaTone || "green"}`}>
                {program.delta}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <span className="ua-cp-prog-card__chev" aria-hidden="true">›</span>
      <div className="ua-cp-prog-ins pg-ins">
        <div className="ua-cp-prog-ins__label">{program.name} · insights</div>
        <div className="ua-cp-prog-ins__grid">
          {program.insights.map((item) => (
            <InsightCell key={item.label} item={item} />
          ))}
        </div>
      </div>
    </button>
  );
}

export function HealthProgressCarousel({ userId, programs: programsProp, onNavigate, initialIndex = 0 }) {
  const programs = Array.isArray(programsProp)
    ? programsProp
    : getHealthPrograms(userId);
  const [index, setIndex] = useState(initialIndex);
  const hasMany = programs.length > 1;
  const active = programs[index] ?? programs[0];

  if (!active) {
    return (
      <div className="ua-cp-health-progress">
        <div className="ua-cp-health-progress__head">
          <span>Health progress</span>
        </div>
        <div className="ua-cp-prog-card" style={{ background: "#f8fafc", cursor: "default" }}>
          <div className="ua-cp-prog-card__copy">
            <span className="ua-cp-prog-card__name">No progress logs yet</span>
            <div className="ua-cp-prog-card__values">
              <span className="ua-cp-prog-card__current" style={{ color: "#64748b" }}>—</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function prev() {
    setIndex((i) => (i - 1 + programs.length) % programs.length);
  }

  function next() {
    setIndex((i) => (i + 1) % programs.length);
  }

  function openProgram(programId) {
    onNavigate?.("health-progress", { program: programId });
  }

  return (
    <div className="ua-cp-health-progress">
      <div className="ua-cp-health-progress__head">
        <span>Health progress</span>
        {hasMany ? (
          <div className="ua-cp-health-progress__nav">
            <button type="button" aria-label="Previous program" onClick={prev}>‹</button>
            <div className="ua-cp-health-progress__dots">
              {programs.map((p, i) => (
                <span
                  key={p.id}
                  className={`ua-cp-health-progress__dot${i === index ? " ua-cp-health-progress__dot--active" : ""}`}
                />
              ))}
            </div>
            <button type="button" aria-label="Next program" onClick={next}>›</button>
          </div>
        ) : null}
      </div>
      <ProgramCard program={active} onOpen={openProgram} />
    </div>
  );
}
