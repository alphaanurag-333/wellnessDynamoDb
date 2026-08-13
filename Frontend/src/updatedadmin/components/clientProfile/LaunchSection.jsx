import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PillTabs } from "../shared.jsx";
import {
  LAUNCH_DOMAINS,
  LAUNCH_LIFESTYLE,
  LAUNCH_PRAKRITI,
  RATING_OPTIONS,
} from "../../data/launchData.js";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal.jsx";

function LaunchHeader({ onSchedule }) {
  return (
    <div className="ua-cp-launch-head">
      <div>
        <h2 className="ua-cp-launch-head__title">LAUNCH</h2>
        <p className="ua-cp-launch-head__sub">
          Lifestyle Assessment &amp; Understanding of Nutrition, Constitution &amp; Health
        </p>
      </div>
      <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--launch-schedule" onClick={onSchedule}>
        📅 Schedule LAUNCH meeting
      </button>
    </div>
  );
}

function ScoreCard({ lifestyle }) {
  return (
    <div className="ua-cp-launch-score">
      <div>
        <span className="ua-cp-launch-score__label">Final life score</span>
        <span className="ua-cp-launch-score__pts">{lifestyle.points} / {lifestyle.maxPoints} points</span>
      </div>
      <div className="ua-cp-launch-score__val">
        <strong>{lifestyle.finalScore}</strong>
        <span>/ 10</span>
      </div>
    </div>
  );
}

function PrakritiCard({ prakriti }) {
  const max = 10;
  return (
    <div className="ua-cp-launch-prakriti-card">
      <div className="ua-cp-launch-prakriti-card__top">
        <div>
          <span className="ua-cp-launch-prakriti-card__label">Your prakṛti</span>
          <strong>{prakriti.dominant}</strong>
        </div>
        <span className="ua-cp-launch-prakriti-card__elements">{prakriti.elements}</span>
      </div>
      <div className="ua-cp-launch-prakriti-card__bars">
        {[
          { key: "vata", label: "Vāta", tone: "blue", val: prakriti.scores.vata },
          { key: "pitta", label: "Pitta", tone: "orange", val: prakriti.scores.pitta },
          { key: "kapha", label: "Kapha", tone: "green", val: prakriti.scores.kapha },
        ].map((d) => (
          <div key={d.key} className="ua-cp-launch-prakriti-bar">
            <span className={`ua-cp-launch-prakriti-bar__dot ua-cp-launch-prakriti-bar__dot--${d.tone}`} />
            <span className="ua-cp-launch-prakriti-bar__label">{d.label}</span>
            <div className="ua-cp-launch-prakriti-bar__track">
              <span className={`ua-cp-launch-prakriti-bar__fill ua-cp-launch-prakriti-bar__fill--${d.tone}`} style={{ width: `${(d.val / max) * 100}%` }} />
            </div>
            <span className="ua-cp-launch-prakriti-bar__val">{d.val}/{max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptControls({ attempt, historyCount, historyOpen, onToggleHistory, onRerun, rerunLabel = "Re-run assessment" }) {
  return (
    <div className="ua-cp-launch-controls">
      <span className="ua-cp-launch-controls__attempt">Attempt {attempt}</span>
      <button type="button" className="ua-cp-launch-controls__btn" onClick={onToggleHistory}>
        {historyOpen ? `Hide history · ${historyCount}` : `History · ${historyCount}`}
      </button>
      <button type="button" className="ua-cp-launch-controls__rerun" onClick={onRerun}>↻ {rerunLabel}</button>
    </div>
  );
}

function HistoryTable({ rows, footnote }) {
  return (
    <div className="ua-cp-launch-history">
      {rows.map((r) => (
        <div key={r.attempt} className="ua-cp-launch-history__row">
          <span className="ua-cp-launch-history__attempt">Attempt {r.attempt}</span>
          <strong className="ua-cp-launch-history__score">{r.score ?? r.type}</strong>
          <span className="ua-cp-launch-history__pts">{r.points ?? r.scores}</span>
          <span className={`ua-cp-launch-history__role ua-cp-launch-history__role--${r.role === "ADMIN" ? "admin" : "coach"}`}>{r.role === "ADMIN" ? "ADMIN" : "WELLNESS COACH"}</span>
          <span className="ua-cp-launch-history__by">{r.by}</span>
          <span className="ua-cp-launch-history__date">{r.date}</span>
        </div>
      ))}
      {footnote ? <p className="ua-cp-launch-history__foot">{footnote}</p> : null}
    </div>
  );
}

function DomainAccordion({ domain, open, onToggle, ratings, onRate }) {
  const pct = Math.round((domain.score / domain.max) * 100);
  return (
    <div className={`ua-cp-launch-domain${open ? " ua-cp-launch-domain--open" : ""}`}>
      <button type="button" className="ua-cp-launch-domain__head" onClick={onToggle}>
        <span className="ua-cp-launch-domain__chev">{open ? "▾" : "▸"}</span>
        <span className="ua-cp-launch-domain__num">{domain.num}</span>
        <strong>{domain.title}</strong>
        <span className="ua-cp-launch-domain__meta">{domain.questions} questions</span>
        <div className="ua-cp-launch-domain__bar-wrap">
          <div className="ua-cp-launch-domain__bar"><span style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="ua-cp-launch-domain__score">{domain.score} / {domain.max}</span>
      </button>
      {open && domain.items.length ? (
        <div className="ua-cp-launch-questions">
          <div className="ua-cp-launch-questions__toolbar">
            <span />
            <div className="ua-cp-launch-questions__expand-btns">
              <button type="button" className="ua-cp-launch-questions__expand-btn">Expand all</button>
              <button type="button" className="ua-cp-launch-questions__expand-btn">Collapse all</button>
            </div>
          </div>
          <div className="ua-cp-launch-qtable-wrap">
            <table className="ua-cp-launch-qtable">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>User reply · coach notes</th>
                  <th>Coach rating</th>
                  <th>Weightage</th>
                </tr>
              </thead>
              <tbody>
                {domain.items.map((item, i) => (
                  <tr key={item.q}>
                    <td className="ua-cp-launch-qtable__q">
                      <span className="ua-cp-launch-qtable__n">{i + 1}</span>
                      {item.q}
                      <span className="ua-cp-launch-qtable__info" title="Info">i</span>
                    </td>
                    <td><input className="ua-cp-launch-qtable__input" defaultValue={item.reply} readOnly /></td>
                    <td>
                      <div className="ua-cp-launch-ratings">
                        {RATING_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`ua-cp-launch-rating ua-cp-launch-rating--${opt.tone}${(ratings[`${domain.id}-${i}`] ?? item.rating) === opt.id ? " ua-cp-launch-rating--active" : ""}`}
                            onClick={() => onRate(`${domain.id}-${i}`, opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="ua-cp-launch-qtable__weight">
                      <input className="ua-cp-launch-qtable__score" defaultValue={item.score} readOnly />
                      <span>/ {item.weight}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FocusAreas({ onToast }) {
  const [point, setPoint] = useState("");
  return (
    <div className="ua-cp-launch-focus">
      <div className="ua-cp-launch-focus__head">
        <span>✓ Areas to focus</span>
        <span>Domains scoring under 50% are flagged automatically. Add or remove points as needed.</span>
      </div>
      <div className="ua-cp-launch-focus__empty">No focus areas — all domains are above 50%.</div>
      <div className="ua-cp-launch-focus__add">
        <input type="text" placeholder="Add a focus point…" value={point} onChange={(e) => setPoint(e.target.value)} />
        <button type="button" className="ua-cp-btn ua-cp-btn--orange ua-cp-btn--sm" onClick={() => { if (point) { onToast("Focus point added"); setPoint(""); } }}>Add point</button>
      </div>
    </div>
  );
}

function DoshaColumn({ dosha }) {
  return (
    <div className={`ua-cp-launch-dosha ua-cp-launch-dosha--${dosha.tone}`}>
      <div className="ua-cp-launch-dosha__head">
        <span className="ua-cp-launch-dosha__letter">{dosha.letter}</span>
        <div>
          <strong>{dosha.name}</strong>
          <span>{dosha.sub}</span>
        </div>
        <span className="ua-cp-launch-dosha__score">{dosha.score}/10</span>
      </div>
      <div className="ua-cp-launch-dosha__list">
        {dosha.statements.map((s) => (
          <label key={s.text} className="ua-cp-launch-dosha__item">
            <span className={`ua-cp-launch-dosha__check${s.checked ? " ua-cp-launch-dosha__check--on" : ""}`}>{s.checked ? "✓" : ""}</span>
            {s.text}
          </label>
        ))}
      </div>
    </div>
  );
}

function GuidanceColumn({ title, sub, tag, tone, items, addLabel, onToast }) {
  const [list, setList] = useState(items);
  return (
    <div className={`ua-cp-launch-guide ua-cp-launch-guide--${tone}`}>
      <div className="ua-cp-launch-guide__head">
        <div>
          <strong>{title}</strong>
          <span>{sub}</span>
        </div>
        {tag ? <span className="ua-cp-launch-guide__tag">{tag}</span> : null}
      </div>
      <div className="ua-cp-launch-guide__list">
        {list.map((item) => (
          <div key={item} className="ua-cp-launch-guide__item">
            <span className={`ua-cp-launch-guide__bullet ua-cp-launch-guide__bullet--${tone}`} />
            <span>{item}</span>
            <button type="button" className="ua-cp-launch-guide__remove" onClick={() => setList((l) => l.filter((x) => x !== item))} aria-label="Remove">×</button>
          </div>
        ))}
      </div>
      <button type="button" className={`ua-cp-launch-guide__add ua-cp-launch-guide__add--${tone}`} onClick={() => onToast(`Add ${addLabel}`)}>
        + {addLabel}
      </button>
    </div>
  );
}

function LifestyleTab({ onToast }) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const [openDomain, setOpenDomain] = useState("gut");
  const [ratings, setRatings] = useState({});

  return (
    <>
      <ScoreCard lifestyle={LAUNCH_LIFESTYLE} />
      <AttemptControls
        attempt={LAUNCH_LIFESTYLE.attempt}
        historyCount={LAUNCH_LIFESTYLE.history.length}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((o) => !o)}
        onRerun={() => onToast("Re-running lifestyle assessment")}
      />
      {historyOpen ? (
        <HistoryTable
          rows={LAUNCH_LIFESTYLE.history}
          footnote="Every re-run archives the previous result. Nothing is overwritten."
        />
      ) : null}
      <div className="ua-cp-launch-domains-toolbar">
        <span />
        <div>
          <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={() => setOpenDomain("gut")}>Expand all</button>
          <button type="button" className="ua-cp-launch-questions__expand-btn" onClick={() => setOpenDomain(null)}>Collapse all</button>
        </div>
      </div>
      {LAUNCH_DOMAINS.map((d) => (
        <DomainAccordion
          key={d.id}
          domain={d}
          open={openDomain === d.id}
          onToggle={() => setOpenDomain((cur) => (cur === d.id ? null : d.id))}
          ratings={ratings}
          onRate={(key, val) => setRatings((r) => ({ ...r, [key]: val }))}
        />
      ))}
      <FocusAreas onToast={onToast} />
    </>
  );
}

function PrakritiTab({ onToast }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const p = LAUNCH_PRAKRITI;

  return (
    <>
      <p className="ua-cp-launch-prakriti-hint">
        Tick the statements that describe the client. The dosha with the most ticks is their dominant Prakṛti.
      </p>
      <PrakritiCard prakriti={p} />
      <AttemptControls
        attempt={p.attempt}
        historyCount={p.history.length}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((o) => !o)}
        onRerun={() => onToast("Re-running Prakriti assessment")}
      />
      {historyOpen ? (
        <HistoryTable rows={p.history} footnote="Every re-run archives the previous result. Nothing is overwritten." />
      ) : null}
      <div className="ua-cp-launch-dosha-grid">
        {p.doshas.map((d) => <DoshaColumn key={d.id} dosha={d} />)}
      </div>
      <div className="ua-cp-launch-guide-grid">
        <GuidanceColumn
          title="Recommendations"
          sub="Diet & lifestyle guidance suited to this Prakriti."
          tag="FOR PITTA"
          tone="rec"
          items={p.recommendations}
          addLabel="Add recommendation"
          onToast={onToast}
        />
        <GuidanceColumn
          title="Things to avoid"
          sub="Foods & habits that aggravate this Prakriti."
          tone="avoid"
          items={p.avoid}
          addLabel="Add item"
          onToast={onToast}
        />
      </div>
    </>
  );
}

export function LaunchSection({ user, onToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "prakriti" ? "prakriti" : "lifestyle";
  const [tab, setTab] = useState(tabFromUrl);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  function handleTabChange(next) {
    setTab(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("section", "launch");
      if (next === "prakriti") p.set("tab", "prakriti");
      else p.delete("tab");
      return p;
    }, { replace: true });
  }

  return (
    <div className="ua-cp-section ua-cp-launch">
      <LaunchHeader onSchedule={() => setScheduleOpen(true)} />
      <PillTabs
        size="md"
        active={tab}
        onChange={handleTabChange}
        tabs={[
          { id: "lifestyle", label: "Lifestyle score" },
          { id: "prakriti", label: "Prakriti type" },
        ]}
      />
      {tab === "lifestyle" ? <LifestyleTab onToast={onToast} /> : <PrakritiTab onToast={onToast} />}
      {scheduleOpen ? (
        <ScheduleMeetingModal
          user={user}
          title="Schedule LAUNCH meeting"
          defaultNote="We will walk through your LAUNCH results together."
          defaultDuration={60}
          onClose={() => setScheduleOpen(false)}
          onSend={() => { onToast("LAUNCH meeting slots sent"); setScheduleOpen(false); }}
        />
      ) : null}
    </div>
  );
}
