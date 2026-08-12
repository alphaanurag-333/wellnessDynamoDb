import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import {
  INTERNAL_PARAMS,
  countSelected,
  flattenTests,
} from "../../data/internalParametersData.js";

function SummaryCards({ onToggleHistory, historyOpen }) {
  return (
    <div className="ua-cp-ip-summary">
      <div className="ua-cp-ip-summary__card">
        <span className="ua-cp-ip-summary__label">Last report</span>
        <strong className="ua-cp-ip-summary__val">{INTERNAL_PARAMS.lastReport.date}</strong>
        <span className="ua-cp-ip-summary__sub">{INTERNAL_PARAMS.lastReport.ago}</span>
      </div>
      <div className="ua-cp-ip-summary__card">
        <span className="ua-cp-ip-summary__label">Next due</span>
        <strong className="ua-cp-ip-summary__val">{INTERNAL_PARAMS.nextDue.date}</strong>
        <span className="ua-cp-ip-summary__sub">{INTERNAL_PARAMS.nextDue.sub}</span>
      </div>
      <button type="button" className="ua-cp-ip-summary__history-btn" onClick={onToggleHistory}>
        {historyOpen ? "▴ Hide report history" : `Report history · ${INTERNAL_PARAMS.reportHistory.length}`}
      </button>
      <span className="ua-cp-ip-summary__alert">{INTERNAL_PARAMS.outOfRangeAlert}</span>
    </div>
  );
}

function ReportHistory() {
  return (
    <div className="ua-cp-ip-history">
      {INTERNAL_PARAMS.reportHistory.map((r) => (
        <div key={r.date} className="ua-cp-ip-history__item">
          <div className="ua-cp-ip-history__top">
            <div>
              <strong>{r.date}</strong>
              <span>{r.meta}</span>
            </div>
            <span className={`ua-cp-ip-badge ua-cp-ip-badge--${r.tone}`}>{r.status}</span>
          </div>
          {r.markers.length ? (
            <div className="ua-cp-ip-history__markers">
              {r.markers.map((m) => (
                <span key={m} className="ua-cp-ip-marker">{m}</span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function NamespaceSearch({ groups, onAdd, onToast }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const existingIds = useMemo(() => new Set(groups.map((g) => g.id)), [groups]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INTERNAL_PARAMS.testNamespaces.filter((ns) => {
      if (existingIds.has(ns.id)) return false;
      if (!q) return true;
      return ns.name.toLowerCase().includes(q);
    });
  }, [search, existingIds]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function pick(ns) {
    onAdd(ns);
    setSearch("");
    setOpen(false);
    onToast(`${ns.name} added`);
  }

  return (
    <div className="ua-cp-ip-search-wrap" ref={wrapRef}>
      <div className={`ua-cp-ip-search${open && options.length ? " ua-cp-ip-search--open" : ""}`}>
        <span className="ua-cp-ip-search__icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          placeholder="Add a test namespace…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-expanded={open && options.length > 0}
          aria-haspopup="listbox"
          aria-controls="ua-cp-ip-ns-list"
        />
      </div>
      {open && options.length ? (
        <ul id="ua-cp-ip-ns-list" className="ua-cp-ip-ns-dropdown" role="listbox">
          {options.map((ns) => (
            <li key={ns.id}>
              <button type="button" role="option" className="ua-cp-ip-ns-dropdown__item" onClick={() => pick(ns)}>
                {ns.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RecommendedTestsTab({ user, onToast }) {
  const [preset, setPreset] = useState("Fat Loss");
  const [published, setPublished] = useState(INTERNAL_PARAMS.publishedStatus.sent);
  const [dirty, setDirty] = useState(false);

  const initialSelected = useMemo(() => {
    const map = {};
    INTERNAL_PARAMS.testGroups.forEach((g) => {
      flattenTests(g).forEach((t) => { map[`${g.id}:${t}`] = true; });
    });
    return map;
  }, []);

  const [selected, setSelected] = useState(initialSelected);
  const [groups, setGroups] = useState(INTERNAL_PARAMS.testGroups);

  const totalSelected = useMemo(() => {
    return groups.reduce((sum, g) => sum + countSelected(g, selected).n, 0);
  }, [groups, selected]);

  function markDirty() {
    setDirty(true);
    setPublished(false);
  }

  function toggleTest(key) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
    markDirty();
  }

  function toggleGroup(group) {
    const all = flattenTests(group);
    const counts = countSelected(group, selected);
    const next = counts.n === counts.total ? false : true;
    setSelected((prev) => {
      const copy = { ...prev };
      all.forEach((t) => { copy[`${group.id}:${t}`] = next; });
      return copy;
    });
    markDirty();
  }

  function removeGroup(id) {
    setGroups((list) => list.filter((g) => g.id !== id));
    markDirty();
    onToast("Test group removed");
  }

  function addNamespace(ns) {
    if (groups.some((g) => g.id === ns.id)) return;
    setGroups((list) => [...list, { id: ns.id, name: ns.name, tests: ns.tests }]);
    setSelected((prev) => {
      const copy = { ...prev };
      flattenTests(ns).forEach((t) => { copy[`${ns.id}:${t}`] = true; });
      return copy;
    });
    markDirty();
  }

  function publish() {
    setPublished(true);
    setDirty(false);
    onToast(`Published test list to ${user.name}`);
  }

  return (
    <div className="ua-cp-ip-rec">
      <div className="ua-cp-ip-rec__head">
        <div>
          <h3 className="ua-cp-ip-rec__title">Recommended blood tests</h3>
          <p className="ua-cp-ip-rec__sub">Set by the wellness coach · download to get tested</p>
        </div>
        <div className="ua-cp-ip-rec__actions">
          {published && !dirty ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--muted" disabled>Published</button>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--green" onClick={publish}>Publish</button>
          )}
          <button type="button" className="ua-cp-btn ua-cp-btn--orange" onClick={() => onToast("Downloading test list")}>↓ Download list</button>
        </div>
      </div>

      {published && !dirty ? (
        <div className="ua-cp-ip-banner ua-cp-ip-banner--sent">
          ✓ {INTERNAL_PARAMS.publishedStatus.message.replace("13 tests", `${totalSelected} tests`)}
        </div>
      ) : dirty ? (
        <div className="ua-cp-ip-banner">
          Unpublished changes — publishing sends the updated list to {user.name.split(" ")[0]} on WhatsApp and in the app.
        </div>
      ) : null}

      <div className="ua-cp-ip-preset">
        <span className="ua-cp-ip-preset__label">Quick preset · goal</span>
        <div className="ua-cp-ip-preset__pills">
          {INTERNAL_PARAMS.goalPresets.map((g) => (
            <button
              key={g}
              type="button"
              className={`ua-cp-ip-preset__pill${preset === g ? " ua-cp-ip-preset__pill--active" : ""}`}
              onClick={() => { setPreset(g); onToast(`Applied ${g} preset`); }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <NamespaceSearch groups={groups} onAdd={addNamespace} onToast={onToast} />

      {groups.map((group) => {
        const counts = countSelected(group, selected);
        const allOn = counts.n === counts.total;
        return (
          <div key={group.id} className="ua-cp-ip-test-group">
            <div className="ua-cp-ip-test-group__head">
              <button type="button" className={`ua-cp-ip-check ua-cp-ip-check--head${allOn ? " ua-cp-ip-check--on" : ""}`} onClick={() => toggleGroup(group)} aria-label={`Toggle ${group.name}`}>
                {allOn ? "✓" : ""}
              </button>
              <strong>{group.name}</strong>
              <span className="ua-cp-ip-test-group__count">{counts.n}/{counts.total} selected</span>
              <button type="button" className="ua-cp-ip-test-group__remove" onClick={() => removeGroup(group.id)} aria-label="Remove group">×</button>
            </div>
            <div className="ua-cp-ip-test-group__grid">
              {group.tests.map((row, ri) => (
                <div key={ri} className="ua-cp-ip-test-group__row">
                  {row.map((test) => test ? (
                    <label key={test} className="ua-cp-ip-test-item">
                      <input
                        type="checkbox"
                        checked={!!selected[`${group.id}:${test}`]}
                        onChange={() => toggleTest(`${group.id}:${test}`)}
                      />
                      <span className={`ua-cp-ip-check${selected[`${group.id}:${test}`] ? " ua-cp-ip-check--on" : ""}`}>
                        {selected[`${group.id}:${test}`] ? "✓" : ""}
                      </span>
                      {test}
                    </label>
                  ) : <span key={`empty-${ri}`} />)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AiReadingCell({ reading }) {
  return (
    <td className="ua-cp-ip-ai__reading">
      <div className={`ua-cp-ip-ai__val ua-cp-ip-ai__val--${reading.tone}`}>{reading.value}</div>
      {reading.note ? <div className="ua-cp-ip-ai__note">{reading.note}</div> : null}
    </td>
  );
}

function ReportAnalysisTab({ onToast }) {
  const { reportUpload, aiDates, aiPanels, bloodSummary, protocol, nutritionSummary } = INTERNAL_PARAMS;
  const analysed = reportUpload.analysed;

  return (
    <div className="ua-cp-ip-report">
      <div className="ua-cp-ip-upload">
        <div className="ua-cp-ip-upload__icon">📄</div>
        <div className="ua-cp-ip-upload__body">
          <strong>{reportUpload.title}</strong>
          <span>{reportUpload.sub}</span>
        </div>
        <div className="ua-cp-ip-upload__actions">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Downloading report")}>↓ Download</button>
          {analysed ? (
            <>
              <span className="ua-cp-ip-badge ua-cp-ip-badge--good">AI analysed</span>
              <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => onToast("Resubmitting to AI")}>⚡ Resubmit to AI</button>
            </>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => onToast("Submitted to AI")}>⚡ Submit to AI</button>
          )}
        </div>
      </div>

      <div className="ua-cp-ip-ai">
        <div className="ua-cp-ip-ai__head">
          <div>
            <strong>⚡ AI interpretation</strong>
            <span>value + interpretation per date</span>
          </div>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Edit mode")}>✎ Edit</button>
        </div>
        <div className="ua-cp-ip-ai__table-wrap">
          <table className="ua-cp-ip-ai__table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Optimal</th>
                <th>RR · PharmEasy</th>
                {aiDates.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {aiPanels.map((panel) => (
                <Fragment key={panel.title}>
                  <tr className="ua-cp-ip-ai__cat">
                    <td colSpan={3 + aiDates.length}>{panel.title}</td>
                  </tr>
                  {panel.rows.map((row) => (
                    <tr key={row.name}>
                      <td className="ua-cp-ip-ai__param">{row.name}</td>
                      <td>{row.optimal}</td>
                      <td>{row.rr}</td>
                      {row.readings.map((r, i) => <AiReadingCell key={i} reading={r} />)}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ua-cp-ip-summary-card">
        <div className="ua-cp-ip-summary-card__head">
          <div>
            <strong>Blood report summary</strong>
            <span className="ua-cp-ip-tag ua-cp-ip-tag--ai">AI GENERATED</span>
          </div>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Editing summary")}>✎ Edit</button>
        </div>
        <p className="ua-cp-ip-summary-card__sub">Synthesised from the latest analysed panel</p>
        <ul className="ua-cp-ip-summary-card__list">
          {bloodSummary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="ua-cp-ip-protocol">
        <div className="ua-cp-ip-protocol__head">
          <div>
            <strong>Protocol · nutritionist recommendation</strong>
            <span>AI-generated · latest {protocol.latest}</span>
          </div>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Editing protocol")}>✎ Edit</button>
        </div>
        <div className="ua-cp-ip-protocol__items">
          {protocol.items.map((item) => (
            <div key={item} className="ua-cp-ip-protocol__item">
              <span className="ua-cp-ip-protocol__check">✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="ua-cp-ip-prev">
        <h4 className="ua-cp-ip-prev__title">Previous protocols</h4>
        {protocol.previous.map((p) => (
          <div key={p.date} className="ua-cp-ip-prev__card">
            <div className="ua-cp-ip-prev__date">{p.date}</div>
            <ul>{p.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="ua-cp-ip-nutrition">
        <div className="ua-cp-ip-nutrition__head">
          <h4>Nutrition summary</h4>
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Editing nutrition summary")}>✎ Edit</button>
        </div>
        <div className="ua-cp-ip-nutrition__latest">
          <span className="ua-cp-ip-tag ua-cp-ip-tag--latest">Latest</span>
          <span className="ua-cp-ip-nutrition__date">{nutritionSummary.latest.date}</span>
          <p>{nutritionSummary.latest.text}</p>
        </div>
        <h4 className="ua-cp-ip-nutrition__hist-title">History</h4>
        {nutritionSummary.history.map((h) => (
          <div key={h.date} className="ua-cp-ip-nutrition__hist-card">
            <div className="ua-cp-ip-nutrition__date">{h.date}</div>
            <p>{h.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InternalParametersSection({ user, onToast }) {
  const [tab, setTab] = useState("tests");
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="ua-cp-section ua-cp-internal">
      <div className="ua-cp-ip-head">
        <div>
          <h2 className="ua-cp-ip-head__title">Internal parameters</h2>
          <p className="ua-cp-ip-head__sub">Coach-recommended blood tests, report uploads, and reviewed results.</p>
        </div>
      </div>

      <SummaryCards historyOpen={historyOpen} onToggleHistory={() => setHistoryOpen((o) => !o)} />
      {historyOpen ? <ReportHistory /> : null}

      <PillTabs
        size="md"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "tests", label: "Recommended tests" },
          { id: "report", label: "Report & analysis" },
        ]}
      />

      {tab === "tests" ? (
        <RecommendedTestsTab user={user} onToast={onToast} />
      ) : (
        <ReportAnalysisTab onToast={onToast} />
      )}
    </div>
  );
}
