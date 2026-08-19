import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import {
  INTERNAL_PARAMS,
  cloneAiPanels,
  countSelected,
  flattenTests,
} from "../../data/internalParametersData.js";
import {
  createUserTestRecommendation,
  downloadUserTestRecommendationPdf,
  fetchTestCatalog,
  fetchUserLabReports,
  fetchUserTestRecommendations,
  reviewUserLabReport,
  analyzeUserLabReport,
  updateUserLabReportAnalysis,
} from "../../api/onboardingApi.js";

const GOAL_PRESET_CATEGORIES = {
  "Fat Loss": ["Cardiac", "Diabetes"],
  "Diabetes Reversal": ["Diabetes"],
  "Thyroid Care": ["Thyroid"],
  "PCOD / PCOS": ["Thyroid", "Hormones"],
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function firstName(user) {
  return String(user?.name || "Client").split(" ")[0];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function triggerFileDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  triggerFileDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function testsFromRecommendation(entry) {
  return (Array.isArray(entry?.tests) ? entry.tests : []).filter((test) => test?.name || test?.testId);
}

function downloadTextList({ filename, title, reportDate, tests }) {
  const grouped = new Map();
  tests.forEach((test) => {
    const category = String(test.category || "Other").trim() || "Other";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(test.name || test.testId || "Test");
  });
  const lines = [title || "Recommended blood tests"];
  if (reportDate) lines.push(`Report date: ${reportDate}`, "");
  grouped.forEach((names, category) => {
    lines.push(category);
    names.forEach((name) => lines.push(`- ${name}`));
    lines.push("");
  });
  const blob = new Blob([`${lines.join("\n").trim()}\n`], { type: "text/plain;charset=utf-8" });
  saveBlob(blob, filename);
}

async function downloadRecommendationList({
  userId,
  recommendationId,
  pdfUrl,
  reportDate,
  tests,
  onToast,
}) {
  const datePart = String(reportDate || todayIso()).slice(0, 10);
  const pdfName = `recommended-tests-${datePart}.pdf`;

  if (userId && recommendationId) {
    try {
      const blob = await downloadUserTestRecommendationPdf(userId, recommendationId);
      if (blob) {
        saveBlob(blob, pdfName);
        return;
      }
    } catch (err) {
      if (!pdfUrl && !(tests && tests.length)) {
        onToast?.(err?.message || "Failed to download list");
        return;
      }
    }
  }

  if (pdfUrl) {
    triggerFileDownload(pdfUrl, pdfName);
    return;
  }

  if (tests?.length) {
    downloadTextList({
      filename: `recommended-tests-${datePart}.txt`,
      title: "Recommended blood tests",
      reportDate: formatDisplayDate(reportDate),
      tests,
    });
    return;
  }

  onToast?.("Select at least one test to download");
}

function daysFromNow(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - Date.now()) / 86400000);
}

function addDaysIso(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function storedAnalysisToPanels(analysis) {
  const dateLabel = analysis?.dateLabel || "—";
  return {
    dates: [dateLabel],
    panels: (analysis?.panels || []).map((panel) => ({
      title: panel.title,
      rows: (panel.rows || []).map((row) => ({
        name: row.name,
        optimal: row.optimal || "—",
        rr: row.rr || "—",
        readings: [{ value: row.value ?? "—", tone: row.tone || "neutral", note: row.note || "" }],
      })),
    })),
  };
}

function uiToStoredAnalysis({ panels, dateLabel, bloodSummary, protocolItems, nutritionSummary }) {
  return {
    dateLabel: dateLabel || "—",
    panels: (panels || []).map((panel) => ({
      title: panel.title,
      rows: (panel.rows || []).map((row) => {
        const reading = row.readings?.[0] || {};
        return {
          name: row.name,
          optimal: row.optimal,
          rr: row.rr,
          value: reading.value ?? "—",
          tone: reading.tone || "neutral",
          note: reading.note || "",
        };
      }),
    })),
    bloodSummary,
    protocolItems,
    nutritionSummary,
  };
}

function reportAiStatusText(report) {
  if (report?.aiStatus === "failed") {
    return report?.aiAnalysis?.panels?.length ? "AI analysis failed — showing last result" : "AI analysis failed";
  }
  if (report?.aiStatus === "analysed") return "AI analysed";
  return "ready for AI analysis";
}

function catalogGroups(catalog) {
  const map = new Map();
  (catalog || []).forEach((test) => {
    const category = test.category || "Other";
    const id = slugify(category) || "other";
    if (!map.has(id)) map.set(id, { id, name: category, tests: [] });
    map.get(id).tests.push(test);
  });
  return [...map.values()];
}

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

function SummaryCards({ lastReport, nextDue, alertText, historyCount, historyOpen, onToggleHistory }) {
  return (
    <div className="ua-cp-ip-summary">
      <div className="ua-cp-ip-summary__card">
        <span className="ua-cp-ip-summary__label">Last report</span>
        <strong className="ua-cp-ip-summary__val">{lastReport.date}</strong>
        <span className="ua-cp-ip-summary__sub">{lastReport.ago}</span>
      </div>
      <div className="ua-cp-ip-summary__card">
        <span className="ua-cp-ip-summary__label">Next due</span>
        <strong className="ua-cp-ip-summary__val">{nextDue.date}</strong>
        <span className="ua-cp-ip-summary__sub">{nextDue.sub}</span>
      </div>
      <button type="button" className="ua-cp-ip-summary__history-btn" onClick={onToggleHistory}>
        {historyOpen ? "▴ Hide report history" : `Report history · ${historyCount}`}
      </button>
      {alertText ? <span className="ua-cp-ip-summary__alert">{alertText}</span> : null}
    </div>
  );
}

function MockReportHistory({ onToast }) {
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

function reportInRange(reportDate, range, fromDate, toDate) {
  const date = new Date(reportDate);
  if (Number.isNaN(date.getTime())) return false;
  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime()) && date < from) return false;
  }
  if (toDate) {
    const to = new Date(`${toDate}T23:59:59`);
    if (!Number.isNaN(to.getTime()) && date > to) return false;
  }
  if (range === "6m" || range === "1y") {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (range === "6m" ? 6 : 12));
    return date >= cutoff;
  }
  return true;
}

function LiveReportHistory({ reports, busy, onToast, onReview }) {
  const [range, setRange] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filtered = reports.filter((report) => reportInRange(report.reportDate, range, fromDate, toDate));

  function openReport(report) {
    if (!report.fileUrl) {
      onToast("No file attached to this report");
      return;
    }
    window.open(report.fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="ua-cp-ip-history">
      <div className="ua-cp-ip-history__toolbar">
        <div className="ua-cp-ip-history__filters">
          <span className="ua-cp-ip-history__download-label">Filter</span>
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
          <span className="ua-cp-ip-history__count">{filtered.length} of {reports.length} reports</span>
        </div>
      </div>
      {filtered.length ? filtered.map((report) => {
        const reviewed = report.reviewStatus === "reviewed";
        // Prefer the AI payload itself; `aiStatus` can be inconsistent on older records.
        const hasAi = Boolean(report.aiAnalysis?.panels?.length);
        const outOfRange = report.aiAnalysis?.panels?.flatMap((panel) =>
          (panel.rows || [])
            .filter((row) => row.tone === "bad" || row.tone === "warn")
            .map((row) => `${row.name}${row.value && row.value !== "—" ? ` ${row.value}` : ""}${row.rr ? ` (${row.rr})` : ""}`),
        ) || [];
        const badgeText = hasAi
          ? outOfRange.length
            ? `${outOfRange.length} OUT OF RANGE`
            : "ALL IN RANGE"
          : reviewed
          ? "REVIEWED"
          : "PENDING";
        const badgeTone = hasAi
          ? outOfRange.length
            ? "bad"
            : "good"
          : reviewed
          ? "good"
          : "bad";
        const meta = [
          report.labName,
          report.collectionType,
          report.reviewedByName ? `reviewed by ${report.reviewedByName}` : reviewed ? "reviewed by coach" : null,
          report.aiAnalysis?.panels?.length ? `${report.aiAnalysis.panels.reduce((s, p) => s + (p.rows?.length || 0), 0)} markers` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div key={report.id} className="ua-cp-ip-history__item">
            <div className="ua-cp-ip-history__row">
              <div className="ua-cp-ip-history__info">
                <strong>{formatDisplayDate(report.reportDate)}</strong>
                {meta ? <span>{meta}</span> : null}
              </div>
              <div className="ua-cp-ip-history__actions">
                <span className={`ua-cp-ip-badge ua-cp-ip-badge--${badgeTone}`}>
                  {badgeText}
                </span>
                {report.fileUrl ? (
                  <a className="ua-cp-ip-history__dl" href={report.fileUrl} target="_blank" rel="noreferrer" aria-label={`Open report ${report.reportDate}`}>
                    ↓
                  </a>
                ) : (
                  <button type="button" className="ua-cp-ip-history__dl" onClick={() => openReport(report)}>↓</button>
                )}
                {!reviewed ? (
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
                    disabled={busy}
                    onClick={() => onReview(report.id)}
                  >
                    Mark reviewed
                  </button>
                ) : null}
              </div>
            </div>
            {outOfRange.length ? (
              <div className="ua-cp-ip-history__markers">
                {outOfRange.map((label) => (
                  <span key={label} className="ua-cp-ip-marker">{label}</span>
                ))}
              </div>
            ) : null}
          </div>
        );
      }) : <p>No lab reports in this range.</p>}
    </div>
  );
}

function NamespaceSearch({ groups, namespaces, onAdd, onToast }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const existingIds = useMemo(() => new Set(groups.map((g) => g.id)), [groups]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return namespaces.filter((ns) => {
      if (existingIds.has(ns.id)) return false;
      if (!q) return true;
      return ns.name.toLowerCase().includes(q);
    });
  }, [search, existingIds, namespaces]);

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

function MockRecommendedTestsTab({ user, onToast }) {
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
    onToast(`Test list published · sent to ${firstName(user)} on WhatsApp and in the app`);
  }

  function downloadList() {
    const tests = [];
    groups.forEach((group) => {
      flattenTests(group).forEach((name) => {
        if (selected[`${group.id}:${name}`]) tests.push({ name, category: group.name });
      });
    });
    downloadRecommendationList({
      reportDate: todayIso(),
      tests,
      onToast,
    });
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
          <button type="button" className="ua-cp-btn ua-cp-btn--orange" onClick={downloadList}>↓ Download list</button>
        </div>
      </div>

      {published && !dirty ? (
        <div className="ua-cp-ip-banner ua-cp-ip-banner--sent">
          ✓ {INTERNAL_PARAMS.publishedStatus.message.replace("13 tests", `${totalSelected} tests`)}
        </div>
      ) : dirty ? (
        <div className="ua-cp-ip-banner">
          Unpublished changes — publishing sends the updated list to {firstName(user)} on WhatsApp and in the app.
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

      <NamespaceSearch groups={groups} namespaces={INTERNAL_PARAMS.testNamespaces} onAdd={addNamespace} onToast={onToast} />

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

function selectedFromRecommendation(catalog, recommended) {
  const map = {};
  const assigned = new Set();
  (recommended?.tests || []).forEach((test) => {
    [test.testId, test.id, test.catalogId].forEach((value) => {
      const next = String(value || "").trim();
      if (next) assigned.add(next);
    });
    const name = String(test.name || "").trim().toLowerCase();
    if (name) assigned.add(`name:${name}`);
  });
  catalog.forEach((test) => {
    const id = String(test.id || "").trim();
    const testId = String(test.testId || "").trim();
    const name = String(test.name || "").trim().toLowerCase();
    map[id] = assigned.has(id) || assigned.has(testId) || Boolean(name && assigned.has(`name:${name}`));
  });
  return map;
}

function AssignedTestHistory({ userId, current, history, onToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const rows = useMemo(() => {
    const list = [];
    if (current?.id) list.push({ ...current, status: "current" });
    (history || []).forEach((entry) => {
      if (!entry?.id || entry.id === current?.id) return;
      list.push({ ...entry, status: "replaced" });
    });
    return list;
  }, [current, history]);

  if (!rows.length) {
    return (
      <div className="ua-cp-ip-assign-history">
        <h3 className="ua-cp-ip-assign-history__title">Assigned test history</h3>
        <p className="ua-cp-ip-assign-history__empty">No test lists have been published for this client yet.</p>
      </div>
    );
  }

  return (
    <div className="ua-cp-ip-assign-history">
      <h3 className="ua-cp-ip-assign-history__title">Assigned test history</h3>
      <p className="ua-cp-ip-assign-history__intro">Every published list is kept, newest first.</p>
      {rows.map((entry) => {
        const tests = testsFromRecommendation(entry);
        const expanded = expandedId === entry.id;
        const preview = tests.slice(0, 3).map((test) => test.name || test.testId).filter(Boolean).join(", ");
        return (
          <div key={entry.id} className="ua-cp-ip-history__item">
            <div className="ua-cp-ip-history__row">
              <div className="ua-cp-ip-history__info">
                <strong>{formatDisplayDate(entry.reportDate || entry.createdAt)}</strong>
                <span>
                  {tests.length} test{tests.length === 1 ? "" : "s"}
                  {preview ? ` · ${preview}${tests.length > 3 ? "…" : ""}` : ""}
                </span>
              </div>
              <div className="ua-cp-ip-history__actions">
                <span className={`ua-cp-ip-badge ua-cp-ip-badge--${entry.status === "current" ? "good" : "muted"}`}>
                  {entry.status === "current" ? "CURRENT" : "PREVIOUS"}
                </span>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                >
                  {expanded ? "Hide" : "View"}
                </button>
                <button
                  type="button"
                  className="ua-cp-ip-history__dl"
                  aria-label={`Download assigned tests ${formatDisplayDate(entry.reportDate)}`}
                  onClick={() => downloadRecommendationList({
                    userId,
                    recommendationId: entry.id,
                    pdfUrl: entry.pdfUrl,
                    reportDate: entry.reportDate,
                    tests,
                    onToast,
                  })}
                >
                  ↓
                </button>
              </div>
            </div>
            {expanded ? (
              <div className="ua-cp-ip-history__markers">
                {tests.length
                  ? tests.map((test, index) => (
                    <span key={`${entry.id}-${test.testId || test.name || index}`} className="ua-cp-ip-marker ua-cp-ip-marker--neutral">
                      {test.name || test.testId}
                    </span>
                  ))
                  : <span className="ua-cp-ip-assign-history__empty">No tests stored on this assignment.</span>}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LiveRecommendedTestsTab({ user, catalog, recommended, history, busy, onToast, onPublish }) {
  const allGroups = useMemo(() => catalogGroups(catalog), [catalog]);
  const [selected, setSelected] = useState(() => selectedFromRecommendation(catalog, recommended));
  const [presets, setPresets] = useState([]);
  const [focusedPreset, setFocusedPreset] = useState("");
  const [reportDate, setReportDate] = useState(recommended?.reportDate || todayIso());
  const [dirty, setDirty] = useState(!recommended);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelected(selectedFromRecommendation(catalog, recommended));
    setReportDate(recommended?.reportDate || todayIso());
    setDirty(!recommended);
  }, [catalog, recommended]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected],
  );

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGroups
      .filter((group) => !categoryFilter || group.id === categoryFilter)
      .map((group) => ({
        ...group,
        tests: q
          ? group.tests.filter((test) => String(test.name || "").toLowerCase().includes(q))
          : group.tests,
      }))
      .filter((group) => group.tests.length);
  }, [allGroups, categoryFilter, search]);

  function markDirty() {
    setDirty(true);
  }

  function countGroup(group) {
    const total = group.tests.length;
    const n = group.tests.filter((test) => selected[test.id]).length;
    return { n, total };
  }

  function toggleTest(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    markDirty();
  }

  function toggleGroup(group) {
    const { n, total } = countGroup(group);
    const next = n !== total;
    setSelected((prev) => {
      const copy = { ...prev };
      group.tests.forEach((test) => { copy[test.id] = next; });
      return copy;
    });
    markDirty();
  }

  function removeGroup(id) {
    const group = allGroups.find((entry) => entry.id === id);
    if (group) {
      setSelected((prev) => {
        const copy = { ...prev };
        group.tests.forEach((test) => { copy[test.id] = false; });
        return copy;
      });
      setCategoryFilter((current) => (current === id ? "" : current));
    }
    markDirty();
    onToast("Category cleared from selection");
  }

  function togglePreset(goal) {
    setFocusedPreset(goal);
    const categories = new Set((GOAL_PRESET_CATEGORIES[goal] || []).map((c) => c.toLowerCase()));
    setPresets((prev) => {
      const applying = !prev.includes(goal);
      const next = applying ? [...prev, goal] : prev.filter((g) => g !== goal);
      if (applying) {
        setSelected((current) => {
          const copy = { ...current };
          catalog.forEach((test) => {
            if (categories.has(String(test.category || "").toLowerCase())) copy[test.id] = true;
          });
          return copy;
        });
        markDirty();
        onToast(`${goal} preset applied`);
      } else {
        onToast(`Removed ${goal} preset`);
      }
      return next;
    });
  }

  function presetClass(goal) {
    if (focusedPreset === goal && presets.includes(goal)) return " ua-cp-ip-preset__pill--focus";
    if (presets.includes(goal)) return " ua-cp-ip-preset__pill--applied";
    return "";
  }

  async function downloadList() {
    const selectedTests = selectedIds
      .map((id) => catalog.find((test) => test.id === id))
      .filter(Boolean);
    await downloadRecommendationList({
      userId: user?.id,
      recommendationId: recommended?.id,
      pdfUrl: recommended?.pdfUrl,
      reportDate,
      tests: selectedTests.length ? selectedTests : testsFromRecommendation(recommended),
      onToast,
    });
  }

  async function publish() {
    if (!selectedIds.length) {
      onToast("Select at least one test");
      return;
    }
    const ok = await onPublish({ reportDate, testIds: selectedIds });
    if (ok) setDirty(false);
  }

  const published = Boolean(recommended) && !dirty;

  return (
    <div className="ua-cp-ip-rec">
      <div className="ua-cp-ip-rec__head">
        <div>
          <h3 className="ua-cp-ip-rec__title">Recommended blood tests</h3>
          <p className="ua-cp-ip-rec__sub">Set by the wellness coach · download to get tested</p>
        </div>
        <div className="ua-cp-ip-rec__actions">
          <label className="ua-cp-ip-history__date-field">
            <span>Report date</span>
            <input type="date" value={reportDate} onChange={(e) => { setReportDate(e.target.value); markDirty(); }} />
          </label>
          {published ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--muted" disabled>Published</button>
          ) : (
            <button type="button" className="ua-cp-btn ua-cp-btn--green" disabled={busy} onClick={publish}>
              {busy ? "Publishing…" : "Publish"}
            </button>
          )}
          <button type="button" className="ua-cp-btn ua-cp-btn--orange" onClick={downloadList}>↓ Download list</button>
        </div>
      </div>

      {catalog.length ? (
        published ? (
          <div className="ua-cp-ip-banner ua-cp-ip-banner--sent">
            ✓ Sent to {firstName(user)} in the app · {formatDisplayDate(recommended.reportDate)} · {selectedIds.length} tests
          </div>
        ) : (
          <div className="ua-cp-ip-banner">
            Unpublished changes — publishing sends the updated list to {firstName(user)} in the app.
          </div>
        )
      ) : null}

      {catalog.length ? (
        <>
          <div className="ua-cp-ip-rec__toolbar">
            <input
              type="search"
              className="ua-cp-ip-rec__search"
              placeholder="Search tests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="ua-cp-ip-rec__search"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {allGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

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

          {visibleGroups.length ? visibleGroups.map((group) => {
            const counts = countGroup(group);
            const allOn = counts.total > 0 && counts.n === counts.total;
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
                  <button type="button" className="ua-cp-ip-test-group__remove" onClick={() => removeGroup(group.id)} aria-label="Clear category">×</button>
                </div>
                <div className="ua-cp-ip-test-group__grid">
                  {group.tests.map((test) => (
                    <label key={test.id} className="ua-cp-ip-test-item">
                      <input
                        type="checkbox"
                        checked={!!selected[test.id]}
                        onChange={() => toggleTest(test.id)}
                      />
                      <span className={`ua-cp-ip-check${selected[test.id] ? " ua-cp-ip-check--on" : ""}`}>
                        {selected[test.id] ? "✓" : ""}
                      </span>
                      <span className="ua-cp-ip-test-item__label">{test.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }) : (
            <p>No tests match this search.</p>
          )}
        </>
      ) : (
        <p>No live tests in the catalog yet. Add them under Configs → Blood test catalog.</p>
      )}

      <AssignedTestHistory
        userId={user?.id}
        current={recommended}
        history={history}
        onToast={onToast}
      />
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

function MockReportAnalysisTab({ onToast }) {
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
              className="ua-cfg-dp-add__content ua-cp-ip-edit-textarea ua-cp-ip-edit-textarea--compact"
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

function LiveReportAnalysisTab({ reports, busy, onAnalyze, onSaveAnalysis, onToast }) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id || null);

  useEffect(() => {
    if (!reports.length) {
      setSelectedId(null);
      return;
    }
    if (!reports.some((report) => report.id === selectedId)) {
      setSelectedId(reports[0].id);
    }
  }, [reports, selectedId]);

  const selected = reports.find((report) => report.id === selectedId) || reports[0];
  const analysis = selected?.aiAnalysis;
  const hasAnalysis = Boolean(analysis?.panels?.length);
  const analysed = hasAnalysis;
  const ui = storedAnalysisToPanels(analysis);
  const older = reports.filter(
    (report) => report.id !== selected?.id && report.aiStatus === "analysed" && report.aiAnalysis
  );

  const [aiDraft, setAiDraft] = useState(null);
  const [aiEditing, setAiEditing] = useState(false);
  const [bloodSummary, setBloodSummary] = useState(analysis?.bloodSummary || []);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [protocolItems, setProtocolItems] = useState(analysis?.protocolItems || []);
  const [protocolDraft, setProtocolDraft] = useState([]);
  const [protocolEditing, setProtocolEditing] = useState(false);
  const [nutritionLatest, setNutritionLatest] = useState(analysis?.nutritionSummary || "");
  const [nutritionDraft, setNutritionDraft] = useState("");
  const [nutritionEditing, setNutritionEditing] = useState(false);

  useEffect(() => {
    setAiDraft(null);
    setAiEditing(false);
    setBloodSummary(analysis?.bloodSummary || []);
    setSummaryEditing(false);
    setProtocolItems(analysis?.protocolItems || []);
    setProtocolEditing(false);
    setNutritionLatest(analysis?.nutritionSummary || "");
    setNutritionEditing(false);
  }, [selected?.id, selected?.aiAnalysedAt, selected?.updatedAt]);

  if (!selected) {
    return (
      <div className="ua-cp-ip-report">
        <p>No blood report uploaded yet. The client can submit a PDF from Internal Parameters in the app.</p>
      </div>
    );
  }

  const panels = aiEditing && aiDraft ? aiDraft : ui.panels;

  function updateReading(panelIdx, rowIdx, readingIdx, nextReading) {
    setAiDraft((prev) => {
      const next = cloneAiPanels(prev ?? panels);
      next[panelIdx].rows[rowIdx].readings[readingIdx] = nextReading;
      return next;
    });
  }

  async function persist(nextAnalysis, toast) {
    await onSaveAnalysis(selected.id, { aiAnalysis: nextAnalysis });
    onToast?.(toast);
  }

  return (
    <div className="ua-cp-ip-report">
      <div className="ua-cp-ip-upload-list">
        {reports.map((report, index) => {
          const isSelected = report.id === selected.id;
          const reportAnalysed = Boolean(report.aiAnalysis?.panels?.length);
          return (
            <div
              key={report.id}
              className={`ua-cp-ip-upload${isSelected ? " ua-cp-ip-upload--active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(report.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(report.id);
                }
              }}
            >
              <div className="ua-cp-ip-upload__icon">📄</div>
              <div className="ua-cp-ip-upload__body">
                <strong>
                  Blood report uploaded
                  {index === 0 ? <span className="ua-cp-ip-tag ua-cp-ip-tag--latest">Latest</span> : null}
                </strong>
                <span>Added by client · {formatDisplayDate(report.reportDate)} · {reportAiStatusText(report)}</span>
              </div>
              <div className="ua-cp-ip-upload__actions" onClick={(event) => event.stopPropagation()}>
                {report.fileUrl ? (
                  <a className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" href={report.fileUrl} target="_blank" rel="noreferrer">↓ Download</a>
                ) : null}
                {reportAnalysed && report.aiStatus === "analysed" ? (
                  <span className="ua-cp-ip-badge ua-cp-ip-badge--good">AI analysed</span>
                ) : null}
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--ai ua-cp-btn--sm"
                  disabled={busy || !report.fileUrl}
                  title={!report.fileUrl ? "No file attached to this report" : undefined}
                  onClick={() => {
                    setSelectedId(report.id);
                    onAnalyze(report.id);
                  }}
                >
                  <span aria-hidden="true">⚡</span> {busy && isSelected ? "Reading report…" : reportAnalysed ? "Resubmit to AI" : "Submit to AI"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected.aiStatus === "failed" && selected.aiError ? (
        <p className="ua-cp-ip-rec__sub">{selected.aiError}</p>
      ) : null}

      {analysed ? (
        <>
          <div className="ua-cp-ip-ai">
            <div className="ua-cp-ip-ai__head">
              <div>
                <strong>⚡ AI interpretation</strong>
                <span>value + interpretation from the client-uploaded report</span>
              </div>
              <EditActions
                editing={aiEditing}
                onEdit={() => {
                  setAiDraft(cloneAiPanels(panels));
                  setAiEditing(true);
                }}
                onCancel={() => {
                  setAiDraft(null);
                  setAiEditing(false);
                }}
                onSave={async () => {
                  const next = uiToStoredAnalysis({
                    panels: aiDraft || panels,
                    dateLabel: analysis.dateLabel,
                    bloodSummary,
                    protocolItems,
                    nutritionSummary: nutritionLatest,
                  });
                  await persist(next, "AI interpretation saved");
                  setAiDraft(null);
                  setAiEditing(false);
                }}
              />
            </div>
            <div className="ua-cp-ip-ai__table-wrap">
              <table className="ua-cp-ip-ai__table">
                <thead>
                  <tr>
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--1">Parameter</th>
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--2">Optimal</th>
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--3">RR · lab</th>
                    {ui.dates.map((d) => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {panels.map((panel, panelIdx) => (
                    <Fragment key={panel.title}>
                      <tr className="ua-cp-ip-ai__cat">
                        <td colSpan={3 + ui.dates.length}>{panel.title}</td>
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
                onEdit={() => {
                  setSummaryDraft(bloodSummary.join("\n"));
                  setSummaryEditing(true);
                }}
                onCancel={() => setSummaryEditing(false)}
                onSave={async () => {
                  const nextSummary = summaryDraft.split("\n").map((s) => s.trim()).filter(Boolean);
                  await persist(uiToStoredAnalysis({
                    panels,
                    dateLabel: analysis.dateLabel,
                    bloodSummary: nextSummary,
                    protocolItems,
                    nutritionSummary: nutritionLatest,
                  }), "Blood report summary saved");
                  setBloodSummary(nextSummary);
                  setSummaryEditing(false);
                }}
              />
            </div>
            <p className="ua-cp-ip-summary-card__sub">Synthesised from the client-uploaded report</p>
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
                <span>AI-generated · {formatDisplayDate(selected.reportDate)}</span>
              </div>
              <EditActions
                editing={protocolEditing}
                onEdit={() => {
                  setProtocolDraft([...protocolItems]);
                  setProtocolEditing(true);
                }}
                onCancel={() => setProtocolEditing(false)}
                onSave={async () => {
                  const nextItems = protocolDraft.map((s) => s.trim()).filter(Boolean);
                  await persist(uiToStoredAnalysis({
                    panels,
                    dateLabel: analysis.dateLabel,
                    bloodSummary,
                    protocolItems: nextItems,
                    nutritionSummary: nutritionLatest,
                  }), "Protocol saved");
                  setProtocolItems(nextItems);
                  setProtocolEditing(false);
                }}
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

          {older.length ? (
            <div className="ua-cp-ip-prev">
              <h4 className="ua-cp-ip-prev__title">Previous protocols</h4>
              {older.map((report) => (
                <div key={report.id} className="ua-cp-ip-prev__card">
                  <div className="ua-cp-ip-prev__date">{formatDisplayDate(report.reportDate)}</div>
                  <ul>{(report.aiAnalysis?.protocolItems || []).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="ua-cp-ip-rec__sub">Submit the client-uploaded PDF to AI to extract markers and generate the interpretation.</p>
      )}

      {analysed || older.length ? (
        <div className="ua-cp-ip-nutrition">
          <div className="ua-cp-ip-nutrition__head">
            <h4>Nutrition summary</h4>
            {analysed ? (
              <EditActions
                editing={nutritionEditing}
                onEdit={() => {
                  setNutritionDraft(nutritionLatest);
                  setNutritionEditing(true);
                }}
                onCancel={() => setNutritionEditing(false)}
                onSave={async () => {
                  const nextText = nutritionDraft.trim();
                  await persist(uiToStoredAnalysis({
                    panels,
                    dateLabel: analysis.dateLabel,
                    bloodSummary,
                    protocolItems,
                    nutritionSummary: nextText,
                  }), "Nutrition summary saved");
                  setNutritionLatest(nextText);
                  setNutritionEditing(false);
                }}
              />
            ) : null}
          </div>
          {analysed ? (
            <div className="ua-cp-ip-nutrition__latest">
              <span className="ua-cp-ip-tag ua-cp-ip-tag--latest">Latest</span>
              <span className="ua-cp-ip-nutrition__date">{formatDisplayDate(selected.reportDate)}</span>
              {nutritionEditing ? (
                <textarea
                  className="ua-cfg-dp-add__content ua-cp-ip-edit-textarea ua-cp-ip-edit-textarea--compact"
                  value={nutritionDraft}
                  rows={4}
                  onChange={(e) => setNutritionDraft(e.target.value)}
                />
              ) : (
                <p>{nutritionLatest || "No nutrition summary yet."}</p>
              )}
            </div>
          ) : null}
          {older.length ? (
            <>
              <h4 className="ua-cp-ip-nutrition__hist-title">History</h4>
              {older.map((report) => (
                <div key={report.id} className="ua-cp-ip-nutrition__hist-card">
                  <div className="ua-cp-ip-nutrition__date">{formatDisplayDate(report.reportDate)}</div>
                  <p>{report.aiAnalysis?.nutritionSummary || "—"}</p>
                </div>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function InternalParametersSection({ user, onToast }) {
  const [tab, setTab] = useState("tests");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const userId = user?.id;
  const live = Boolean(userId && !/^\d+$/.test(String(userId)));

  const reload = async () => {
    if (!live) return;
    const [rec, labs, tests] = await Promise.allSettled([
      fetchUserTestRecommendations(userId),
      fetchUserLabReports(userId),
      fetchTestCatalog(userId),
    ]);

    if (rec.status === "fulfilled") {
      setRecommended(rec.value?.recommended || rec.value?.recommendation || null);
      setHistory(Array.isArray(rec.value?.history) ? rec.value.history : []);
    }
    if (labs.status === "fulfilled") {
      setReports(Array.isArray(labs.value) ? labs.value : []);
    }
    if (tests.status === "fulfilled") {
      const list = Array.isArray(tests.value) ? tests.value : tests.value?.tests || [];
      setCatalog(list);
    } else {
      setCatalog([]);
    }

    const failed = [tests, rec, labs].find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  };

  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch((err) => onToast?.(err?.message || "Failed to load internal parameters"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleReview(reportId) {
    try {
      setBusy(true);
      await reviewUserLabReport(userId, reportId);
      onToast?.("Report marked reviewed");
      await reload();
    } catch (err) {
      onToast?.(err?.message || "Failed to review report");
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyze(reportId) {
    try {
      setBusy(true);
      await analyzeUserLabReport(userId, reportId);
      onToast?.("Submitted to AI");
      await reload();
    } catch (err) {
      onToast?.(err?.message || "Failed to analyse report");
      await reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAnalysis(reportId, payload) {
    try {
      setBusy(true);
      await updateUserLabReportAnalysis(userId, reportId, payload);
      await reload();
    } catch (err) {
      onToast?.(err?.message || "Failed to save analysis");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(payload) {
    try {
      setBusy(true);
      await createUserTestRecommendation(userId, payload);
      onToast?.(`Test list sent to ${firstName(user)} in the app`);
      await reload();
      return true;
    } catch (err) {
      onToast?.(err?.message || "Failed to assign tests");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const latestReport = reports[0];
  const lastDays = latestReport ? daysFromNow(latestReport.reportDate) : null;
  const nextDueIso = latestReport ? addDaysIso(latestReport.reportDate, 90) : "";
  const nextDays = nextDueIso ? daysFromNow(nextDueIso) : null;
  const pendingCount = reports.filter((report) => report.reviewStatus !== "reviewed").length;

  return (
    <div className="ua-cp-section ua-cp-internal">
      <div className="ua-cp-ip-head">
        <div>
          <h2 className="ua-cp-ip-head__title">Internal parameters</h2>
          <p className="ua-cp-ip-head__sub">Coach-recommended blood tests, report uploads, and reviewed results.</p>
        </div>
      </div>

      {live && loading ? <p>Loading internal parameters…</p> : null}

      {live ? (
        <SummaryCards
          lastReport={{
            date: latestReport ? formatDisplayDate(latestReport.reportDate) : "—",
            ago: latestReport
              ? `uploaded ${Math.abs(lastDays ?? 0)} day${Math.abs(lastDays ?? 0) === 1 ? "" : "s"} ago`
              : "No upload yet",
          }}
          nextDue={{
            date: nextDueIso ? formatDisplayDate(nextDueIso) : "—",
            sub: nextDueIso
              ? `${nextDays >= 0 ? `in ${nextDays} days` : `${Math.abs(nextDays)} days overdue`} · 90-day cycle`
              : "Starts after the first report",
          }}
          alertText={pendingCount ? `${pendingCount} report${pendingCount === 1 ? "" : "s"} pending review` : null}
          historyCount={reports.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((open) => !open)}
        />
      ) : (
        <SummaryCards
          lastReport={INTERNAL_PARAMS.lastReport}
          nextDue={INTERNAL_PARAMS.nextDue}
          alertText={INTERNAL_PARAMS.outOfRangeAlert}
          historyCount={INTERNAL_PARAMS.reportHistory.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((open) => !open)}
        />
      )}

      {historyOpen ? (
        live ? (
          <LiveReportHistory reports={reports} busy={busy} onToast={onToast} onReview={handleReview} />
        ) : (
          <MockReportHistory onToast={onToast} />
        )
      ) : null}

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
        live ? (
          <LiveRecommendedTestsTab
            user={user}
            catalog={catalog}
            recommended={recommended}
            history={history}
            busy={busy}
            onToast={onToast}
            onPublish={handlePublish}
          />
        ) : (
          <MockRecommendedTestsTab user={user} onToast={onToast} />
        )
      ) : live ? (
        <LiveReportAnalysisTab
          reports={reports}
          busy={busy}
          onAnalyze={handleAnalyze}
          onSaveAnalysis={handleSaveAnalysis}
          onToast={onToast}
        />
      ) : (
        <MockReportAnalysisTab onToast={onToast} />
      )}
    </div>
  );
}
