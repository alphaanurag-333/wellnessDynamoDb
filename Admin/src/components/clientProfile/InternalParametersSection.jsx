import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import {
  INTERNAL_PARAMS,
  cloneAiPanels,
  countSelected,
  flattenTests,
} from "../../data/internalParametersData.js";

function EditActions({ editing, onEdit, onCancel, onSave }) {
  if (editing) {
    return (
      <div className="ua-cp-ip-edit-actions">
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onCancel}>Cancel</button>
        <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={onSave}>Save</button>
      </div>
    );
  }
  return (
    <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onEdit}>✎ Edit</button>
  );
}

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

function ReportHistory({ onToast }) {
  const [range, setRange] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const reports = INTERNAL_PARAMS.reportHistory;

  return (
    <div className="ua-cp-ip-history">
      <div className="ua-cp-ip-history__toolbar">
        <div className="ua-cp-ip-history__filters">
          <span className="ua-cp-ip-history__download-label">Download</span>
          <label className="ua-cp-ip-history__date-field">
            <span>From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="ua-cp-ip-history__date-field">
            <span>To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <div className="ua-cp-ip-history__range">
            {["6m", "1y", "all"].map((id) => (
              <button
                key={id}
                type="button"
                className={`ua-cp-ip-history__range-btn${range === id ? " ua-cp-ip-history__range-btn--active" : ""}`}
                onClick={() => setRange(id)}
              >
                {id === "all" ? "All" : id}
              </button>
            ))}
          </div>
        </div>
        <div className="ua-cp-ip-history__toolbar-actions">
          <button type="button" className="ua-cp-btn ua-cp-btn--orange ua-cp-btn--sm" onClick={() => onToast(`Downloading ${reports.length} reports`)}>
            ↓ Download {reports.length}
          </button>
          <span className="ua-cp-ip-history__count">{reports.length} of {reports.length} reports</span>
        </div>
      </div>
      {reports.map((r) => (
        <div key={r.date} className="ua-cp-ip-history__item">
          <div className="ua-cp-ip-history__row">
            <div className="ua-cp-ip-history__info">
              <strong>{r.date}</strong>
              <span>{r.meta}</span>
            </div>
            <div className="ua-cp-ip-history__actions">
              <span className={`ua-cp-ip-badge ua-cp-ip-badge--${r.tone}`}>{r.status}</span>
              <button type="button" className="ua-cp-ip-history__dl" onClick={() => onToast(`Downloading report ${r.date}`)} aria-label={`Download report ${r.date}`}>
                ↓
              </button>
            </div>
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
  const [presets, setPresets] = useState(["Fat Loss", "Diabetes Reversal"]);
  const [focusedPreset, setFocusedPreset] = useState("Diabetes Reversal");
  const [published, setPublished] = useState(false);
  const [dirty, setDirty] = useState(true);

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

  function togglePreset(goal) {
    setFocusedPreset(goal);
    setPresets((prev) => {
      const next = prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal];
      onToast(next.includes(goal) ? `${goal} preset applied` : `Removed ${goal} preset`);
      return next;
    });
    markDirty();
  }

  function presetClass(goal) {
    if (focusedPreset === goal && presets.includes(goal)) return " ua-cp-ip-preset__pill--focus";
    if (presets.includes(goal)) return " ua-cp-ip-preset__pill--applied";
    return "";
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
    onToast(`Test list published · sent to ${user.name.split(" ")[0]} on WhatsApp and in the app`);
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
              className={`ua-cp-ip-preset__pill${presetClass(g)}`}
              onClick={() => togglePreset(g)}
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
        const partial = counts.n > 0 && !allOn;
        return (
          <div key={group.id} className="ua-cp-ip-test-group">
            <div className="ua-cp-ip-test-group__head">
              <button
                type="button"
                className={`ua-cp-ip-check ua-cp-ip-check--head${allOn || partial ? " ua-cp-ip-check--on" : ""}${partial ? " ua-cp-ip-check--partial" : ""}`}
                onClick={() => toggleGroup(group)}
                aria-label={`Toggle ${group.name}`}
              >
                {allOn ? "✓" : partial ? "−" : ""}
              </button>
              <strong className="ua-cp-ip-test-group__title">{group.name}</strong>
              <span className="ua-cp-ip-test-group__count">{counts.n}/{counts.total} selected</span>
              <button type="button" className="ua-cp-ip-test-group__remove" onClick={() => removeGroup(group.id)} aria-label="Remove group">×</button>
            </div>
            <div className="ua-cp-ip-test-group__grid">
              {flattenTests(group).map((test) => (
                <label key={test} className="ua-cp-ip-test-item">
                  <input
                    type="checkbox"
                    checked={!!selected[`${group.id}:${test}`]}
                    onChange={() => toggleTest(`${group.id}:${test}`)}
                  />
                  <span className={`ua-cp-ip-check${selected[`${group.id}:${test}`] ? " ua-cp-ip-check--on" : ""}`}>
                    {selected[`${group.id}:${test}`] ? "✓" : ""}
                  </span>
                  <span className="ua-cp-ip-test-item__label">{test}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AiReadingCell({ reading, editing, onChange }) {
  if (editing) {
    return (
      <td className="ua-cp-ip-ai__reading ua-cp-ip-ai__reading--edit">
        <input
          className="ua-cp-ip-ai__val-input"
          value={reading.value}
          onChange={(e) => onChange({ ...reading, value: e.target.value })}
          aria-label="Parameter value"
        />
        <textarea
          className="ua-cp-ip-ai__note-input"
          value={reading.note}
          rows={3}
          onChange={(e) => onChange({ ...reading, note: e.target.value })}
          placeholder="Interpretation note…"
          aria-label="Interpretation note"
        />
      </td>
    );
  }

  return (
    <td className="ua-cp-ip-ai__reading">
      <div className={`ua-cp-ip-ai__val ua-cp-ip-ai__val--${reading.tone}`}>{reading.value}</div>
      {reading.note ? <div className="ua-cp-ip-ai__note">{reading.note}</div> : null}
    </td>
  );
}

function ReportAnalysisTab({ onToast }) {
  const { aiDates, protocol, nutritionSummary: initialNutrition } = INTERNAL_PARAMS;
  const [analysed, setAnalysed] = useState(INTERNAL_PARAMS.reportUpload.analysed);
  const [aiPanels, setAiPanels] = useState(() => cloneAiPanels(INTERNAL_PARAMS.aiPanels));
  const [aiDraft, setAiDraft] = useState(null);
  const [aiEditing, setAiEditing] = useState(false);

  const [bloodSummary, setBloodSummary] = useState(INTERNAL_PARAMS.bloodSummary);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryEditing, setSummaryEditing] = useState(false);

  const [protocolItems, setProtocolItems] = useState(protocol.items);
  const [protocolDraft, setProtocolDraft] = useState([]);
  const [protocolEditing, setProtocolEditing] = useState(false);

  const [nutritionLatest, setNutritionLatest] = useState(initialNutrition.latest.text);
  const [nutritionDraft, setNutritionDraft] = useState("");
  const [nutritionEditing, setNutritionEditing] = useState(false);

  function updateReading(panelIdx, rowIdx, readingIdx, nextReading) {
    setAiDraft((prev) => {
      const panels = cloneAiPanels(prev ?? aiPanels);
      panels[panelIdx].rows[rowIdx].readings[readingIdx] = nextReading;
      return panels;
    });
  }

  function startAiEdit() {
    setAiDraft(cloneAiPanels(aiPanels));
    setAiEditing(true);
  }

  function cancelAiEdit() {
    setAiDraft(null);
    setAiEditing(false);
  }

  function saveAiEdit() {
    if (aiDraft) setAiPanels(aiDraft);
    setAiDraft(null);
    setAiEditing(false);
    onToast("AI interpretation saved");
  }

  function startSummaryEdit() {
    setSummaryDraft(bloodSummary.join("\n"));
    setSummaryEditing(true);
  }

  function saveSummaryEdit() {
    setBloodSummary(summaryDraft.split("\n").map((s) => s.trim()).filter(Boolean));
    setSummaryEditing(false);
    onToast("Blood report summary saved");
  }

  function startProtocolEdit() {
    setProtocolDraft([...protocolItems]);
    setProtocolEditing(true);
  }

  function saveProtocolEdit() {
    setProtocolItems(protocolDraft.map((s) => s.trim()).filter(Boolean));
    setProtocolEditing(false);
    onToast("Protocol saved");
  }

  function startNutritionEdit() {
    setNutritionDraft(nutritionLatest);
    setNutritionEditing(true);
  }

  function saveNutritionEdit() {
    setNutritionLatest(nutritionDraft.trim());
    setNutritionEditing(false);
    onToast("Nutrition summary saved");
  }

  const panels = aiEditing && aiDraft ? aiDraft : aiPanels;

  return (
    <div className="ua-cp-ip-report">
      <div className="ua-cp-ip-upload">
        <div className="ua-cp-ip-upload__icon">📄</div>
        <div className="ua-cp-ip-upload__body">
          <strong>{INTERNAL_PARAMS.reportUpload.title}</strong>
          <span>{INTERNAL_PARAMS.reportUpload.sub}</span>
        </div>
        <div className="ua-cp-ip-upload__actions">
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={() => onToast("Downloading report")}>↓ Download</button>
          {analysed ? (
            <>
              <span className="ua-cp-ip-badge ua-cp-ip-badge--good">AI analysed</span>
              <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => { setAnalysed(true); onToast("Resubmitting to AI"); }}>⚡ Resubmit to AI</button>
            </>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => { setAnalysed(true); onToast("Submitted to AI"); }}>⚡ Submit to AI</button>
          )}
        </div>
      </div>

      {analysed ? (
        <>
          <div className="ua-cp-ip-ai">
            <div className="ua-cp-ip-ai__head">
              <div>
                <strong>⚡ AI interpretation</strong>
                <span>value + interpretation per date</span>
              </div>
              <EditActions
                editing={aiEditing}
                onEdit={startAiEdit}
                onCancel={cancelAiEdit}
                onSave={saveAiEdit}
              />
            </div>
            <div className="ua-cp-ip-ai__table-wrap">
              <table className="ua-cp-ip-ai__table">
                <thead>
                  <tr>
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--1">Parameter</th>
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--2">Optimal</th>
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--3">RR · PharmEasy</th>
                    {aiDates.map((d) => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {panels.map((panel, panelIdx) => (
                    <Fragment key={panel.title}>
                      <tr className="ua-cp-ip-ai__cat">
                        <td colSpan={3 + aiDates.length}>{panel.title}</td>
                      </tr>
                      {panel.rows.map((row, rowIdx) => (
                        <tr key={row.name}>
                          <td className="ua-cp-ip-ai__param ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--1">{row.name}</td>
                          <td className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--2">{row.optimal}</td>
                          <td className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--3">{row.rr}</td>
                          {row.readings.map((r, readingIdx) => (
                            <AiReadingCell
                              key={readingIdx}
                              reading={r}
                              editing={aiEditing}
                              onChange={(next) => updateReading(panelIdx, rowIdx, readingIdx, next)}
                            />
                          ))}
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
              <EditActions
                editing={summaryEditing}
                onEdit={startSummaryEdit}
                onCancel={() => setSummaryEditing(false)}
                onSave={saveSummaryEdit}
              />
            </div>
            <p className="ua-cp-ip-summary-card__sub">Synthesised from the latest analysed panel</p>
            {summaryEditing ? (
              <textarea
                className="ua-cp-ip-edit-textarea"
                value={summaryDraft}
                rows={8}
                onChange={(e) => setSummaryDraft(e.target.value)}
                placeholder="One bullet per line…"
              />
            ) : (
              <ul className="ua-cp-ip-summary-card__list">
                {bloodSummary.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </div>

          <div className="ua-cp-ip-protocol">
            <div className="ua-cp-ip-protocol__head">
              <div>
                <strong>Protocol · nutritionist recommendation</strong>
                <span>AI-generated · latest {protocol.latest}</span>
              </div>
              <EditActions
                editing={protocolEditing}
                onEdit={startProtocolEdit}
                onCancel={() => setProtocolEditing(false)}
                onSave={saveProtocolEdit}
              />
            </div>
            <div className="ua-cp-ip-protocol__items">
              {(protocolEditing ? protocolDraft : protocolItems).map((item, idx) => (
                <div key={idx} className="ua-cp-ip-protocol__item">
                  <span className="ua-cp-ip-protocol__check">✓</span>
                  {protocolEditing ? (
                    <input
                      className="ua-cp-ip-protocol__input"
                      value={item}
                      onChange={(e) => {
                        const next = [...protocolDraft];
                        next[idx] = e.target.value;
                        setProtocolDraft(next);
                      }}
                    />
                  ) : item}
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
        </>
      ) : null}

      <div className="ua-cp-ip-nutrition">
        <div className="ua-cp-ip-nutrition__head">
          <h4>Nutrition summary</h4>
          <EditActions
            editing={nutritionEditing}
            onEdit={startNutritionEdit}
            onCancel={() => setNutritionEditing(false)}
            onSave={saveNutritionEdit}
          />
        </div>
        <div className="ua-cp-ip-nutrition__latest">
          <span className="ua-cp-ip-tag ua-cp-ip-tag--latest">Latest</span>
          <span className="ua-cp-ip-nutrition__date">{initialNutrition.latest.date}</span>
          {nutritionEditing ? (
            <textarea
              className="ua-cp-ip-edit-textarea ua-cp-ip-edit-textarea--compact"
              value={nutritionDraft}
              rows={4}
              onChange={(e) => setNutritionDraft(e.target.value)}
            />
          ) : (
            <p>{nutritionLatest}</p>
          )}
        </div>
        <h4 className="ua-cp-ip-nutrition__hist-title">History</h4>
        {initialNutrition.history.map((h) => (
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
      {historyOpen ? <ReportHistory onToast={onToast} /> : null}

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
