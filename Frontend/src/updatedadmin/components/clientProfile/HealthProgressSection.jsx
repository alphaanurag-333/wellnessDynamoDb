import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getHealthPrograms } from "../../data/healthProgressData.js";

function TrendBars({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <div className="ua-cp-hp-trend">
      {values.map((v, i) => (
        <span
          key={i}
          className={`ua-cp-hp-trend__bar${i === values.length - 1 ? " ua-cp-hp-trend__bar--active" : ""}`}
          style={{ height: `${Math.max(12, (v / max) * 100)}%`, background: color }}
        />
      ))}
    </div>
  );
}

function ProgramDetailCard({ program, highlighted }) {
  const isBar = program.layout === "bar";

  return (
    <article
      id={`hp-${program.id}`}
      className={`ua-cp-hp-card${highlighted ? " ua-cp-hp-card--highlight" : ""}`}
    >
      <div className="ua-cp-hp-card__head">
        <div className="ua-cp-hp-card__identity">
          <span className="ua-cp-hp-card__icon" style={{ background: program.iconBg }}>
            <span className={`pgi ${program.iconClass}`}>{program.icon}</span>
          </span>
          <div>
            <h3 className="ua-cp-hp-card__title">{program.name}</h3>
            <span className="ua-cp-hp-card__metric">{program.metric}</span>
          </div>
        </div>
        <TrendBars values={program.trend || []} color={program.accent} />
      </div>

      <div className="ua-cp-hp-card__hero">
        {isBar ? (
          <>
            {program.current ? (
              <div className="ua-cp-hp-card__value" style={{ color: program.accent }}>{program.current}</div>
            ) : null}
            <div className="ua-cp-prog-card__bar ua-cp-prog-card__bar--wide">
              <span style={{ width: `${program.barPct}%`, background: program.accent }}>{program.barLabel}</span>
            </div>
            {program.status ? (
              <div className={`ua-cp-prog-card__status ua-cp-prog-card__status--${program.statusTone || "muted"}`}>
                {program.status}
              </div>
            ) : null}
          </>
        ) : (
          <div className="ua-cp-prog-card__values ua-cp-prog-card__values--lg">
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

      <div className="ua-cp-hp-insights">
        <div className="ua-cp-hp-insights__label">{program.name} · insights</div>
        <div className="ua-cp-prog-ins__grid ua-cp-prog-ins__grid--static">
          {program.insights.map((item) => (
            <div
              key={item.label}
              className={`ua-cp-prog-ins__cell${item.tone ? ` ua-cp-prog-ins__cell--${item.tone}` : ""}${item.highlight ? " ua-cp-prog-ins__cell--highlight" : ""}`}
            >
              <div className="ua-cp-prog-ins__cell-label">{item.label}</div>
              <div className="ua-cp-prog-ins__cell-val">{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      {program.history?.length ? (
        <div className="ua-cp-hp-history">
          <div className="ua-cp-hp-history__label">Recent readings</div>
          <div className="ua-cp-hp-history__table">
            <div className="ua-cp-hp-history__head">
              <div>Date</div>
              <div>Value</div>
              <div>Change</div>
            </div>
            {program.history.map((row) => (
              <div key={row.date} className="ua-cp-hp-history__row">
                <div>{row.date}</div>
                <div>{row.value}</div>
                <div className={`ua-cp-hp-history__delta ua-cp-hp-history__delta--${row.tone}`}>{row.delta}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function HealthProgressSection({ user }) {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("program");
  const programs = getHealthPrograms(user.n);
  const scrolled = useRef(false);

  useEffect(() => {
    if (!focusId || scrolled.current) return undefined;
    const el = document.getElementById(`hp-${focusId}`);
    if (!el) return undefined;
    scrolled.current = true;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusId]);

  return (
    <div className="ua-cp-section ua-cp-hp-section">
      <div className="ua-cp-hp-section__head">
        <div>
          <h2 className="ua-cp-hp-section__title">Health progress</h2>
          <p className="ua-cp-hp-section__sub">Track health metrics and progress over time.</p>
        </div>
        <span className="ua-cp-hp-section__count">{programs.length} active program{programs.length === 1 ? "" : "s"}</span>
      </div>
      <div className="ua-cp-hp-section__list">
        {programs.map((program) => (
          <ProgramDetailCard
            key={program.id}
            program={program}
            highlighted={focusId === program.id}
          />
        ))}
      </div>
    </div>
  );
}
