import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { PillTabs } from "../shared.jsx";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import {
  INTERNAL_PARAMS,
  cloneAiPanels,
  countSelected,
  flattenTests,
} from "../../data/internalParametersData.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import {
  appendUserGoalTests,
  createUserTestRecommendation,
  deleteUserTestRecommendation,
  deleteUserLabReport,
  downloadUserTestRecommendationPdf,
  fetchTestCatalog,
  fetchUserLabReports,
  updateUserLabReportSubmission,
  fetchUserTestRecommendations,
  reviewUserLabReport,
  analyzeUserLabReport,
  updateUserLabReportAnalysis,
  patchOnboardingStep,
} from "../../api/onboardingApi.js";
import { useViewAs } from "../../context/ViewAsContext.jsx";
import {
  applyMergedPanelsToReportAnalysis,
  findLatestAnalysedReport,
  mergeAnalysedReportsToPanels,
} from "../../utils/labReportPanels.js";

const GOAL_PRESET_CATEGORIES = {
  "Fat Loss": ["Cardiac", "Diabetes", "Lipid Profile", "HbA1c", "CBC", "Hematology", "Metabolic"],
  "Diabetes Reversal": ["Diabetes", "HbA1c", "Glucose"],
  "Thyroid Care": ["Thyroid"],
  "PCOD / PCOS": ["Thyroid", "Hormones", "PCOD", "PCOS"],
};

function presetMatchKeys(goal) {
  return (GOAL_PRESET_CATEGORIES[goal] || []).map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean);
}

function textMatchesPreset(value, keys) {
  const n = String(value || "").trim().toLowerCase();
  if (!n) return false;
  return keys.some((key) => n === key || n.includes(key));
}

function groupMatchesPreset(group, goal) {
  const keys = presetMatchKeys(goal);
  if (!keys.length || !group) return false;
  if (textMatchesPreset(group.name, keys) || textMatchesPreset(group.id, keys)) return true;
  return (group.tests || []).some((test) => {
    if (typeof test === "string") return textMatchesPreset(test, keys);
    return textMatchesPreset(test?.category, keys) || textMatchesPreset(test?.name, keys);
  });
}

function groupsForPreset(allGroups, goal) {
  return (allGroups || []).filter((group) => groupMatchesPreset(group, goal));
}

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
  const raw = String(value).trim();
  const dayOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dayOnly
    ? new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function assignmentDate(entry) {
  return entry?.createdAt || entry?.updatedAt || entry?.reportDate || "";
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

function openPdf(url, onToast) {
  if (!url) {
    onToast?.("No PDF file is attached");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function LabReportPdfModal({ open, url, dateLabel, clientName, onClose, onToast }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const titleDate = dateLabel ? formatDisplayDate(dateLabel) : "";
  const name = clientName || "Client";

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-present-modal ua-cp-present-modal--letter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="lab-report-pdf-title"
      >
        <div className="ua-cp-present-letter__head">
          <div className="ua-cp-present-letter__head-copy">
            <h3 id="lab-report-pdf-title" className="ua-cp-present-letter__title">Blood report PDF</h3>
            <p className="ua-cp-present-letter__meta">
              {url
                ? `Uploaded by ${name}${titleDate ? ` · ${titleDate}` : ""}`
                : "No PDF file is attached to this report"}
            </p>
          </div>
          <div className="ua-cp-present-letter__head-actions">
            {url ? (
              <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={() => openPdf(url, onToast)}>
                Open PDF
              </button>
            ) : null}
            <button type="button" className="ua-cp-present-letter__close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        {url ? (
          <iframe className="ua-cp-present-letter__frame" title="Blood report PDF" src={url} />
        ) : (
          <div className="ua-cp-present-letter__empty">
            <strong>No PDF available</strong>
            <p>This lab report does not have an attached PDF file.</p>
          </div>
        )}
      </div>
    </div>
  );
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

function reportAiStatusText(report) {
  if (report?.aiStatus === "failed") {
    return report?.aiAnalysis?.panels?.length ? "AI analysis failed — showing last result" : "AI analysis failed";
  }
  if (report?.aiStatus === "analysed") return "AI analysed";
  return "ready for AI analysis";
}

function formatTestDuration(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  if (/^\d+(\.\d+)?$/.test(text)) return `${text} ${Number(text) === 1 ? "hr" : "hrs"}`;
  return text;
}

function hoursFromDuration(duration, hours) {
  const n = Number(hours);
  if (Number.isFinite(n) && n >= 0) return Math.min(168, Math.round(n));
  const match = String(duration || "").match(/(\d+)/);
  return match ? Math.min(168, Number(match[1])) : 12;
}

function codeFromLine(line) {
  const code = String(line?.code || "").trim().toUpperCase();
  if (code) return code;
  const fasting = String(line?.fastingType || "").trim();
  if (/post/i.test(fasting)) return "PPBS";
  if (/non/i.test(fasting)) return "NF";
  return "FBS";
}

function fastingFromCodeHours(code, hours) {
  const post = /^(pfbs|ppbs|pp|post)/i.test(String(code || ""));
  const h = Number(hours) || 0;
  return post ? "Post-prandial" : h > 0 ? "Fasting" : "Non-fasting";
}

function durationFromHours(hours) {
  const h = Number(hours) || 0;
  return h === 1 ? "1 hr" : `${h} hrs`;
}

function newCustomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `custom::${crypto.randomUUID()}`;
  }
  return `custom::${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyCustomTest(category) {
  return {
    id: newCustomId(),
    custom: true,
    name: "",
    code: "FBS",
    hours: 12,
    category: category || "Other",
    fastingType: "Fasting",
    duration: "12 hrs",
    kind: "test",
  };
}

function isCustomAssignment(test) {
  if (!test) return false;
  if (test.custom === true) return true;
  return String(test.itemId || test.id || "").trim().startsWith("custom::");
}

function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="4" cy="3" r="1.15" fill="currentColor" />
      <circle cx="10" cy="3" r="1.15" fill="currentColor" />
      <circle cx="4" cy="7" r="1.15" fill="currentColor" />
      <circle cx="10" cy="7" r="1.15" fill="currentColor" />
      <circle cx="4" cy="11" r="1.15" fill="currentColor" />
      <circle cx="10" cy="11" r="1.15" fill="currentColor" />
    </svg>
  );
}

function CodeField({ value, disabled, onChange }) {
  return (
    <input
      className="ua-cfg-goals-field ua-cfg-goals-field--code"
      value={value}
      disabled={disabled}
      placeholder="Code"
      aria-label="Code"
      onChange={(event) => onChange(event.target.value.toUpperCase())}
      onBlur={() => {
        if (!String(value || "").trim()) onChange("FBS");
      }}
    />
  );
}

/** One pickable item per catalog line; entries without lines stay a single item. */
function catalogItems(catalog) {
  return (catalog || []).flatMap((entry) => {
    const kind = entry?.kind === "goal" ? "goal" : "test";
    const lines = Array.isArray(entry?.lines) ? entry.lines.filter((line) => line?.name) : [];
    if (!lines.length) {
      return [{
        ...entry,
        catalogId: entry.id,
        kind,
        code: codeFromLine(entry),
        hours: hoursFromDuration(entry.duration, entry.hours),
      }];
    }
    return lines.map((line, index) => ({
      id: `${entry.id}::${index}`,
      catalogId: entry.id,
      lineIndex: index,
      testId: entry.testId,
      panelName: entry.name,
      name: line.name,
      category: line.category || entry.category,
      fastingType: line.fastingType || "",
      duration: line.duration || "",
      code: codeFromLine(line),
      hours: hoursFromDuration(line.duration, line.hours),
      kind,
    }));
  });
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

/** Active admin-created goals from Configs → Goals & Tests. */
function catalogGoalPresets(catalog) {
  return (catalog || [])
    .filter((row) => row?.kind === "goal" && row.status !== "inactive")
    .filter((row) => Array.isArray(row.lines) && row.lines.some((line) => line?.name))
    .map((row) => ({
      id: String(row.id),
      name: String(row.name || "").trim() || "Goal",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One group per catalog entry (e.g. "Glucose Test" or a goal), holding that entry's lines. */
function testTitleGroups(items) {
  const map = new Map();
  (items || []).forEach((item) => {
    const id = String(item.catalogId || item.id);
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: item.panelName || item.name || "Test",
        kind: item.kind === "goal" ? "goal" : "test",
        tests: [],
        searchText: "",
      });
    }
    map.get(id).tests.push(item);
  });
  return [...map.values()].map((group) => ({
    ...group,
    searchText: [
      group.name,
      group.kind === "goal" ? "goal" : "",
      ...group.tests.flatMap((test) => [test.name, test.category]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));
}

function EditActions({ editing, onEdit, onCancel, onSave }) {
  const { canEdit } = useClientSectionPermissions("internal");
  if (!canEdit) return null;
  if (editing) {
    return (
      <div className="ua-cp-ip-edit-actions">
        <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onCancel}>Cancel</button>
        <button type="button" className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm" onClick={onSave}>Save</button>
      </div>
    );
  }
  return (
    <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={onEdit}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg> Edit</button>
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
      {alertText ? <span className="ua-cp-ip-summary__alert" style={{fontWeight:'400'}}>{alertText}</span> : null}
    </div>
  );
}

function ReportHistoryEmptyModal({ clientName, onClose }) {
  const name = clientName || "this client";
  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-ip-history-empty-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ip-history-empty-title"
        aria-describedby="ip-history-empty-body"
      >
        <div className="ua-cp-modal__head">
          <div>
            <div id="ip-history-empty-title" className="ua-cp-modal__title">Report history</div>
            <div className="ua-cp-modal__sub">{name} · lab report uploads</div>
          </div>
          <button type="button" className="ua-cp-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ua-cp-ip-history-empty" id="ip-history-empty-body">
          <span className="ua-cp-ip-history-empty__icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 13h6" />
              <path d="M9 17h4" />
            </svg>
          </span>
          <strong>No report submitted yet</strong>
          <p>
            {name} hasn&apos;t uploaded a lab report. When they do, it will appear here for review and analysis.
          </p>
        </div>
        <div className="ua-cp-ip-history-empty__actions">
          <button type="button" className="ua-cp-btn ua-cp-btn--green" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
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

function LiveReportHistory({ reports, busy, onToast, onReview, onDelete, canEdit = false }) {
  const [range, setRange] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewing, setViewing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const filtered = reports.filter((report) => reportInRange(report.reportDate, range, fromDate, toDate));

  function openReport(report) {
    if (!report.fileUrl) {
      onToast("No file attached to this report");
      return;
    }
    setViewing(report);
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
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                    onClick={() => openReport(report)}
                  >
                    View PDF
                  </button>
                ) : null}
                {report.fileUrl ? (
                  <a className="ua-cp-ip-history__dl" href={report.fileUrl} target="_blank" rel="noreferrer" aria-label={`Download report ${report.reportDate}`}>
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
                {canEdit ? (
                  <button
                    type="button"
                    className="ua-cp-ip-history__delete"
                    disabled={busy}
                    aria-label={`Delete report ${formatDisplayDate(report.reportDate)}`}
                    onClick={() => setPendingDelete(report)}
                  >
                    ×
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
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Delete blood report"
        title={`Delete the report from ${formatDisplayDate(pendingDelete?.reportDate)}?`}
        body="This removes the report from the client’s app. The file is deleted and cannot be restored."
        cancelLabel="Keep report"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const id = pendingDelete?.id;
          setPendingDelete(null);
          if (id) onDelete?.(id);
        }}
      />
      <LabReportPdfModal
        open={Boolean(viewing)}
        url={viewing?.fileUrl || ""}
        dateLabel={viewing?.reportDate}
        onClose={() => setViewing(null)}
        onToast={onToast}
      />
    </div>
  );
}

function pinnedGroupIds(groups, selectedMap) {
  return groups
    .filter((group) => group.tests.some((test) => selectedMap[test.id]))
    .map((group) => group.id);
}

function NamespaceSearch({
  groups,
  namespaces,
  onAdd,
  onToast,
  disabled = false,
  placeholder = "+ Add a test category…",
  allAddedLabel = "All categories added",
  noMatchLabel = "No matching categories",
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const openRef = useRef(false);
  const listId = useId();
  const existingIds = useMemo(() => new Set(groups.map((g) => g.id)), [groups]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return namespaces.filter((ns) => {
      if (existingIds.has(ns.id)) return false;
      if (!q) return true;
      return String(ns.searchText || ns.name || "").toLowerCase().includes(q);
    });
  }, [search, existingIds, namespaces]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [search, open, options.length]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        openRef.current = false;
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  function setListOpen(next) {
    if (disabled) return;
    setOpen(next);
    openRef.current = next;
    if (next) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      inputRef.current?.blur();
    }
  }

  function toggleList(e) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setListOpen(!openRef.current);
  }

  function pick(ns) {
    if (!ns || disabled) return;
    onAdd(ns);
    setSearch("");
    setListOpen(false);
    onToast?.(`${ns.name} added`);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setListOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setListOpen(true);
      if (!options.length) return;
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setListOpen(true);
      if (!options.length) return;
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!openRef.current) {
        setListOpen(true);
        return;
      }
      if (!options.length) return;
      pick(options[active] || options[0]);
    }
  }

  const showList = open && !disabled;

  return (
    <div className="ua-cp-ip-search-wrap" ref={wrapRef}>
      <div
        className={`ua-cp-ip-search${showList ? " ua-cp-ip-search--open" : ""}`}
        onPointerDown={toggleList}
      >
        <span className="ua-cp-ip-search__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            setListOpen(true);
          }}
          onKeyDown={onKeyDown}
          aria-expanded={showList}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>
      {showList ? (
        <ul id={listId} className="ua-cp-ip-ns-dropdown" role="listbox">
          {options.length ? options.map((ns, index) => (
            <li key={ns.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`ua-cp-ip-ns-dropdown__item${index === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(ns);
                }}
              >
                <span>{ns.name}</span>
                {ns.kind === "goal" ? (
                  <span className="ua-cp-ip-ns-dropdown__meta">Goal</span>
                ) : ns.category ? (
                  <span className="ua-cp-ip-ns-dropdown__meta">{ns.category}</span>
                ) : null}
              </button>
            </li>
          )) : (
            <li className="ua-cp-ip-ns-dropdown__empty">
              {existingIds.size >= namespaces.length ? allAddedLabel : noMatchLabel}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

function sameCategoryName(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function testIdentityKey(test) {
  return `${String(test?.category || "").trim().toLowerCase()}::${String(test?.name || "").trim().toLowerCase()}`;
}

function extrasFromRecommendation({ items, goalGroups, selectedMap }) {
  const extras = {};
  const extraItemIds = new Set();
  const pinnedGoals = (goalGroups || []).filter((group) =>
    (group.tests || []).some((test) => selectedMap[test.id]),
  );

  pinnedGoals.forEach((group) => {
    extras[group.id] = {};
  });

  const nativeKeys = new Set();
  pinnedGoals.forEach((group) => {
    group.tests.forEach((test) => nativeKeys.add(`${group.id}::${testIdentityKey(test)}`));
  });

  (items || []).forEach((item) => {
    if (item?.kind === "goal" || !selectedMap[item.id]) return;
    const host = pinnedGoals.find((group) => {
      const native = group.tests.some((test) => sameCategoryName(test.category, item.category));
      if (!native) return false;
      return !nativeKeys.has(`${group.id}::${testIdentityKey(item)}`);
    });
    if (!host) return;
    const category = String(
      host.tests.find((test) => sameCategoryName(test.category, item.category))?.category || item.category || "Other",
    ).trim() || "Other";
    if (!extras[host.id][category]) extras[host.id][category] = [];
    extras[host.id][category].push(item);
    extraItemIds.add(item.id);
  });

  return { extras, extraItemIds };
}

function customRowsFromRecommendation(recommended, { items, extraItemIds, goalGroups, selectedMap }) {
  const extras = {};
  const standalone = [];
  const knownIds = new Set((items || []).map((item) => String(item.id || "")));
  const pinnedGoals = (goalGroups || []).filter((group) =>
    (group.tests || []).some((test) => selectedMap[test.id]),
  );

  (recommended?.tests || []).forEach((test) => {
    if (!isCustomAssignment(test)) return;
    const itemId = String(test.itemId || test.id || "").trim();
    if (itemId && (extraItemIds.has(itemId) || knownIds.has(itemId))) return;

    const hours = hoursFromDuration(test.duration, test.hours);
    const code = String(test.code || "").trim().toUpperCase() || codeFromLine(test);
    const category = String(test.category || "Other").trim() || "Other";
    const row = {
      id: itemId || newCustomId(),
      custom: true,
      name: test.name || "",
      code,
      hours,
      category,
      fastingType: test.fastingType || fastingFromCodeHours(code, hours),
      duration: test.duration || durationFromHours(hours),
      kind: "test",
    };

    const host = pinnedGoals.find((group) =>
      group.tests.some((entry) => sameCategoryName(entry.category, category)),
    );
    if (host) {
      if (!extras[host.id]) extras[host.id] = {};
      const sectionName = String(
        host.tests.find((entry) => sameCategoryName(entry.category, category))?.category || category,
      ).trim() || "Other";
      if (!extras[host.id][sectionName]) extras[host.id][sectionName] = [];
      extras[host.id][sectionName].push(row);
    } else {
      standalone.push(row);
    }
  });

  return { extras, standalone };
}

function MockRecommendedTestsTab({ user, onToast, canEdit = true, canExport = true }) {
  const [presets, setPresets] = useState(["Fat Loss"]);
  const [focusedPreset, setFocusedPreset] = useState("Fat Loss");
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
  const namespaceCatalog = useMemo(() => {
    const map = new Map();
    [...INTERNAL_PARAMS.testGroups, ...INTERNAL_PARAMS.testNamespaces].forEach((ns) => {
      if (!map.has(ns.id)) map.set(ns.id, ns);
    });
    return [...map.values()];
  }, []);

  const totalSelected = useMemo(() => {
    return groups.reduce((sum, g) => sum + countSelected(g, selected).n, 0);
  }, [groups, selected]);

  function markDirty() {
    setDirty(true);
    setPublished(false);
  }

  function togglePreset(goal) {
    const applying = !presets.includes(goal);
    setFocusedPreset(applying ? goal : "");
    setPresets(applying ? [goal] : []);

    if (applying) {
      const nextGroups = groupsForPreset(namespaceCatalog, goal);
      setGroups(nextGroups);
      const nextSelected = {};
      nextGroups.forEach((group) => {
        flattenTests(group).forEach((test) => { nextSelected[`${group.id}:${test}`] = true; });
      });
      setSelected(nextSelected);
      onToast(nextGroups.length ? `${goal} preset applied` : `No tests in catalog for ${goal}`);
    } else {
      setGroups([]);
      setSelected({});
      onToast(`Removed ${goal} preset`);
    }
    markDirty();
  }

  function presetClass(goal) {
    return presets.includes(goal) ? " ua-cp-ip-preset__pill--applied" : "";
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
          ) : canEdit ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--green" onClick={publish}>Publish</button>
          ) : null}
          {canExport ? (
          <button type="button" className="ua-cp-btn ua-cp-btn--orange" onClick={downloadList}>↓ Download list</button>
          ) : null}
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
        <p className="ua-cp-ip-preset__label">Quick preset · goal</p>
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

      {canEdit ? (
        <NamespaceSearch groups={groups} namespaces={namespaceCatalog} onAdd={addNamespace} onToast={onToast} />
      ) : null}

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
                <label key={test} className="ua-cp-ip-test-item" onMouseDown={(e) => e.preventDefault()}>
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

function selectedFromRecommendation(items, recommended) {
  const map = {};
  const assignedItems = new Set();
  const assignedLegacy = new Set();
  (recommended?.tests || []).forEach((test) => {
    const itemId = String(test.itemId || "").trim();
    if (itemId) {
      assignedItems.add(itemId);
      return;
    }
    [test.testId, test.id, test.catalogId].forEach((value) => {
      const next = String(value || "").trim();
      if (next) assignedLegacy.add(next);
    });
    const name = String(test.name || "").trim().toLowerCase();
    if (name) assignedLegacy.add(`name:${name}`);
  });
  items.forEach((item) => {
    const id = String(item.id || "").trim();
    const name = String(item.name || "").trim().toLowerCase();
    map[id] = assignedItems.has(id)
      || assignedLegacy.has(String(item.catalogId || ""))
      || assignedLegacy.has(String(item.testId || ""))
      || Boolean(name && assignedLegacy.has(`name:${name}`));
  });
  return map;
}

function AssignedTestHistory({ userId, current, history, onToast, onDelete, canEdit = false, busy = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
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
        <p className="ua-cp-ip-assign-history__empty" style={{textAlign:"center"}}>No test lists have been published for this client yet.</p>
      </div>
    );
  }

  return (
    <div className="ua-cp-ip-assign-history">
      <h3 className="ua-cp-ip-assign-history__title">Assigned test history</h3>
      <p className="ua-cp-ip-assign-history__intro">Lists are shown by the date they were published, newest first.</p>
      {rows.map((entry) => {
        const tests = testsFromRecommendation(entry);
        const expanded = expandedId === entry.id;
        const preview = tests.slice(0, 3).map((test) => test.name || test.testId).filter(Boolean).join(", ");
        const publishedOn = formatDisplayDate(assignmentDate(entry));
        const reportOn = formatDisplayDate(entry.reportDate);
        const showReportDate = Boolean(entry.reportDate) && reportOn !== publishedOn;
        return (
          <div key={entry.id} className="ua-cp-ip-history__item">
            <div className="ua-cp-ip-history__row">
              <div className="ua-cp-ip-history__info">
                <strong>{publishedOn}</strong>
                <span>
                  {tests.length} test{tests.length === 1 ? "" : "s"}
                  {preview ? ` · ${preview}${tests.length > 3 ? "…" : ""}` : ""}
                  {showReportDate ? ` · Report date ${reportOn}` : ""}
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
                  aria-label={`Download assigned tests ${publishedOn}`}
                  onClick={() => downloadRecommendationList({
                    userId,
                    recommendationId: entry.id,
                    pdfUrl: entry.pdfUrl,
                    reportDate: entry.reportDate || assignmentDate(entry),
                    tests,
                    onToast,
                  })}
                >
                  ↓
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    className="ua-cp-ip-history__delete"
                    disabled={busy}
                    aria-label={`Delete assigned tests ${publishedOn}`}
                    onClick={() => setPendingDelete(entry)}
                  >
                    ×
                  </button>
                ) : null}
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
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Delete recommended tests"
        title={
          pendingDelete?.status === "current"
            ? "Delete the current recommended test list?"
            : `Delete the list from ${formatDisplayDate(assignmentDate(pendingDelete))}?`
        }
        body={
          pendingDelete?.status === "current"
            ? "This removes the list sent to the client. The next older list, if any, becomes current."
            : "This permanently removes this published list and its PDF."
        }
        cancelLabel="Keep list"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const id = pendingDelete?.id;
          setPendingDelete(null);
          if (id) onDelete?.(id);
        }}
      />
    </div>
  );
}

function groupTestsByCategory(tests) {
  const map = new Map();
  (tests || []).forEach((test) => {
    const category = String(test.category || "Other").trim() || "Other";
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(test);
  });
  return [...map.entries()].map(([name, rows]) => ({ name, tests: rows }));
}

function LiveRecommendedTestsTab({ user, catalog, recommended, history, busy, onToast, onPublish, onDelete, onReloadCatalog, canEdit = true, canExport = true }) {
  const items = useMemo(() => catalogItems(catalog), [catalog]);
  const allGroups = useMemo(() => testTitleGroups(items), [items]);
  const goalGroups = useMemo(() => allGroups.filter((group) => group.kind === "goal"), [allGroups]);
  const testGroups = useMemo(() => allGroups.filter((group) => group.kind !== "goal"), [allGroups]);
  const goalPresets = useMemo(() => catalogGoalPresets(catalog), [catalog]);
  const [selected, setSelected] = useState(() => selectedFromRecommendation(catalogItems(catalog), recommended));
  const [reportDate, setReportDate] = useState(todayIso());
  const [dirty, setDirty] = useState(!recommended);
  const [goalExtras, setGoalExtras] = useState({});
  const [customRows, setCustomRows] = useState([]);
  const [drag, setDrag] = useState(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const keepDirtyAfterGoalSaveRef = useRef(false);
  const keepSelectedNamesRef = useRef(new Set());
  const [pinnedIds, setPinnedIds] = useState(() => {
    const initialItems = catalogItems(catalog);
    const initial = selectedFromRecommendation(initialItems, recommended);
    return pinnedGroupIds(testTitleGroups(initialItems), initial);
  });

  useEffect(() => {
    const nextSelected = selectedFromRecommendation(items, recommended);
    const groups = testTitleGroups(items);
    const nextGoals = groups.filter((group) => group.kind === "goal");
    const { extras, extraItemIds } = extrasFromRecommendation({
      items,
      goalGroups: nextGoals,
      selectedMap: nextSelected,
    });
    const customHydrate = customRowsFromRecommendation(recommended, {
      items,
      extraItemIds,
      goalGroups: nextGoals,
      selectedMap: nextSelected,
    });
    Object.entries(customHydrate.extras).forEach(([goalId, byCategory]) => {
      extras[goalId] = extras[goalId] || {};
      Object.entries(byCategory).forEach(([category, rows]) => {
        extras[goalId][category] = [...(extras[goalId][category] || []), ...rows];
      });
    });
    const customSelected = {};
    Object.values(customHydrate.extras).forEach((byCategory) => {
      Object.values(byCategory).forEach((rows) => {
        rows.forEach((row) => { customSelected[row.id] = true; });
      });
    });
    customHydrate.standalone.forEach((row) => { customSelected[row.id] = true; });
    if (keepSelectedNamesRef.current.size) {
      items.forEach((item) => {
        const key = String(item.name || "").trim().toLowerCase();
        if (key && keepSelectedNamesRef.current.has(key)) customSelected[item.id] = true;
      });
      keepSelectedNamesRef.current = new Set();
    }
    setSelected({ ...nextSelected, ...customSelected });
    setReportDate(todayIso());
    const keepDirty = keepDirtyAfterGoalSaveRef.current;
    keepDirtyAfterGoalSaveRef.current = false;
    setDirty(keepDirty || !recommended);
    setGoalExtras(extras);
    setCustomRows(customHydrate.standalone);
    setPinnedIds(
      groups
        .filter((group) => {
          if (group.kind === "goal") return group.tests.some((test) => nextSelected[test.id]);
          return group.tests.some((test) => nextSelected[test.id] && !extraItemIds.has(test.id));
        })
        .map((group) => group.id),
    );
  }, [items, recommended]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected],
  );

  const visibleGoalGroups = useMemo(
    () => goalGroups.filter((group) => pinnedIds.includes(group.id)),
    [goalGroups, pinnedIds],
  );
  const visibleTestGroups = useMemo(
    () => testGroups.filter((group) => pinnedIds.includes(group.id)),
    [testGroups, pinnedIds],
  );

  function markDirty() {
    setDirty(true);
  }

  function extrasForGoal(goalId) {
    return Object.values(goalExtras[goalId] || {}).flat();
  }

  function allAssignableTests() {
    return [...items, ...extrasForGoalAll(), ...customRows];
  }

  function extrasForGoalAll() {
    return Object.values(goalExtras).flatMap((byCategory) => Object.values(byCategory || {}).flat());
  }

  function testsForGroup(group) {
    if (group?.kind === "goal") return [...group.tests, ...extrasForGoal(group.id)];
    if (group?.kind === "custom") return customRows;
    return group?.tests || [];
  }

  function countGroup(group) {
    const tests = testsForGroup(group);
    const total = tests.length;
    const n = tests.filter((test) => selected[test.id]).length;
    return { n, total };
  }

  function toggleTest(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    markDirty();
  }

  function toggleGroup(group) {
    const tests = testsForGroup(group);
    const n = tests.filter((test) => selected[test.id]).length;
    const next = n !== tests.length;
    setSelected((prev) => {
      const copy = { ...prev };
      tests.forEach((test) => { copy[test.id] = next; });
      return copy;
    });
    markDirty();
  }

  function removeGroup(id, kind = "test") {
    const group = allGroups.find((entry) => entry.id === id);
    const extraTests = kind === "goal" ? extrasForGoal(id) : [];
    if (group || extraTests.length) {
      setSelected((prev) => {
        const copy = { ...prev };
        (group?.tests || []).forEach((test) => { copy[test.id] = false; });
        extraTests.forEach((test) => { copy[test.id] = false; });
        return copy;
      });
    }
    if (kind === "goal") {
      setGoalExtras((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setPinnedIds((ids) => ids.filter((entry) => entry !== id));
    markDirty();
    onToast(kind === "goal" ? "Goal removed" : "Test removed");
  }

  function addCustomToCategory(goalId, category) {
    const row = emptyCustomTest(category);
    setGoalExtras((prev) => {
      const byGoal = { ...(prev[goalId] || {}) };
      byGoal[category] = [...(byGoal[category] || []), row];
      return { ...prev, [goalId]: byGoal };
    });
    setSelected((prev) => ({ ...prev, [row.id]: true }));
    markDirty();
  }

  function addStandaloneCustom() {
    const row = emptyCustomTest("Other");
    setCustomRows((list) => [...list, row]);
    setSelected((prev) => ({ ...prev, [row.id]: true }));
    markDirty();
  }

  function patchCustomTest(id, patch, { goalId, category } = {}) {
    const nextPatch = { ...patch };
    if (patch.code != null || patch.hours != null) {
      const current = goalId
        ? (goalExtras[goalId]?.[category] || []).find((test) => test.id === id)
        : customRows.find((test) => test.id === id);
      const code = patch.code != null ? patch.code : current?.code;
      const hours = patch.hours != null ? patch.hours : current?.hours;
      nextPatch.fastingType = fastingFromCodeHours(code, hours);
      nextPatch.duration = durationFromHours(hours);
    }
    if (goalId) {
      setGoalExtras((prev) => ({
        ...prev,
        [goalId]: {
          ...(prev[goalId] || {}),
          [category]: (prev[goalId]?.[category] || []).map((test) => (
            test.id === id ? { ...test, ...nextPatch } : test
          )),
        },
      }));
    } else {
      setCustomRows((list) => list.map((test) => (test.id === id ? { ...test, ...nextPatch } : test)));
    }
    markDirty();
  }

  function removeExtraFromCategory(goalId, category, itemId) {
    setGoalExtras((prev) => {
      const byGoal = { ...(prev[goalId] || {}) };
      byGoal[category] = (byGoal[category] || []).filter((test) => test.id !== itemId);
      if (!byGoal[category].length) delete byGoal[category];
      const next = { ...prev, [goalId]: byGoal };
      if (!Object.keys(byGoal).length) delete next[goalId];
      return next;
    });
    setSelected((prev) => ({ ...prev, [itemId]: false }));
    markDirty();
    onToast("Test removed");
  }

  function removeStandaloneCustom(id) {
    setCustomRows((list) => list.filter((test) => test.id !== id));
    setSelected((prev) => ({ ...prev, [id]: false }));
    markDirty();
    onToast("Test removed");
  }

  function onCustomDrop({ goalId, category, index }) {
    if (!drag || drag.type !== "custom") return;
    const sameList = drag.goalId === goalId && drag.category === category;
    if (!sameList) {
      setDrag(null);
      return;
    }
    if (goalId) {
      setGoalExtras((prev) => ({
        ...prev,
        [goalId]: {
          ...(prev[goalId] || {}),
          [category]: moveItem(prev[goalId]?.[category] || [], drag.index, index),
        },
      }));
    } else {
      setCustomRows((list) => moveItem(list, drag.index, index));
    }
    setDrag(null);
    markDirty();
  }

  function addGroup(group) {
    if (!group || pinnedIds.includes(group.id)) return;
    setPinnedIds((ids) => [...ids, group.id]);
    setSelected((prev) => {
      const copy = { ...prev };
      group.tests.forEach((test) => { copy[test.id] = true; });
      return copy;
    });
    markDirty();
  }

  function toggleGoalPreset(goal) {
    if (pinnedIds.includes(goal.id)) {
      removeGroup(goal.id, "goal");
      return;
    }
    const group = goalGroups.find((entry) => entry.id === goal.id);
    if (!group) {
      onToast(`No tests in catalog for ${goal.name}`);
      return;
    }
    addGroup(group);
    onToast(`${goal.name} added`);
  }

  async function downloadList() {
    const selectedTests = selectedIds
      .map((id) => allAssignableTests().find((test) => test.id === id))
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
    const catalogIds = selectedIds.filter((id) => !String(id).startsWith("custom::"));
    const customTests = allAssignableTests()
      .filter((test) => test.custom && selected[test.id])
      .map((test) => ({
        id: test.id,
        itemId: test.id,
        name: String(test.name || "").trim(),
        code: String(test.code || "FBS").trim().toUpperCase() || "FBS",
        hours: hoursFromDuration(test.duration, test.hours),
        category: test.category || "Other",
      }));
    if (customTests.some((test) => test.name.length < 2)) {
      onToast("Test names need at least 2 characters");
      return;
    }
    if (!catalogIds.length && !customTests.length) {
      onToast("Select at least one test");
      return;
    }
    const ok = await onPublish({ reportDate, testIds: catalogIds, customTests });
    if (ok) setDirty(false);
  }

  function extrasToSave(goalId) {
    return extrasForGoal(goalId)
      .filter((test) => test.custom)
      .map((test) => ({
        id: test.id,
        name: String(test.name || "").trim(),
        code: String(test.code || "FBS").trim().toUpperCase() || "FBS",
        hours: hoursFromDuration(test.duration, test.hours),
        category: test.category || "Other",
        selected: selected[test.id] !== false,
      }))
      .filter((test) => test.name.length >= 2);
  }

  async function saveToGoal(goalId) {
    const ids = goalId ? [goalId] : visibleGoalGroups.map((group) => group.id);
    const payloads = ids
      .map((id) => ({ id, tests: extrasToSave(id) }))
      .filter((entry) => entry.tests.length);
    if (!payloads.length) {
      onToast("Add a named test under a goal first");
      return;
    }
    const userId = user?.id;
    if (!userId || !onReloadCatalog) return;
    setSavingGoal(true);
    try {
      keepSelectedNamesRef.current = new Set(
        payloads.flatMap((entry) => entry.tests.map((test) => test.name.toLowerCase())),
      );
      keepDirtyAfterGoalSaveRef.current = true;
      for (const entry of payloads) {
        await appendUserGoalTests(userId, entry.id, entry.tests);
      }
      onToast(payloads.length === 1
        ? "Tests saved to the goal. Publish when you want to send the list to the client."
        : "Tests saved to the goals. Publish when you want to send the list to the client.");
      await onReloadCatalog();
    } catch (err) {
      keepDirtyAfterGoalSaveRef.current = false;
      keepSelectedNamesRef.current = new Set();
      onToast(err?.message || "Failed to save tests to the goal");
    } finally {
      setSavingGoal(false);
    }
  }

  function renderTestRows(tests, { goalId, category } = {}) {
    return tests.map((test, testIndex) => {
      const on = !!selected[test.id];
      const custom = Boolean(test.custom);
      const editable = custom && canEdit && !busy;
      return (
        <div
          key={test.id}
          className={`ua-cfg-goals-lines__row${on ? " is-on" : ""}${custom ? " is-extra" : ""}`}
          onDragOver={(event) => {
            if (drag?.type === "custom" && drag.goalId === goalId && drag.category === category) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCustomDrop({ goalId, category, index: testIndex });
          }}
        >
          <span
            className="ua-cfg-goals-grip"
            draggable={editable}
            aria-hidden="true"
            onDragStart={(event) => {
              if (!editable) return;
              event.stopPropagation();
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", test.id);
              setDrag({ type: "custom", goalId, category, index: testIndex });
            }}
            onDragEnd={() => setDrag(null)}
          >
            <GripIcon />
          </span>
          <input
            type="checkbox"
            className="ua-cfg-goals-check"
            checked={on}
            disabled={!canEdit || busy}
            aria-label={`Include ${test.name || "test"}`}
            onChange={() => toggleTest(test.id)}
          />
          <input
            className="ua-cfg-goals-field"
            value={test.name}
            disabled={!editable}
            readOnly={!custom}
            placeholder="Test name"
            aria-label="Test name"
            onChange={(event) => patchCustomTest(test.id, { name: event.target.value }, { goalId, category })}
          />
          <CodeField
            value={test.code || "FBS"}
            disabled={!editable}
            onChange={(code) => patchCustomTest(test.id, { code }, { goalId, category })}
          />
          <label className="ua-cfg-goals-hours">
            <input
              type="number"
              min="0"
              max="168"
              className="ua-cfg-goals-field ua-cfg-goals-field--hours"
              value={test.hours ?? hoursFromDuration(test.duration)}
              disabled={!editable}
              aria-label="Fasting or prep hours"
              onChange={(event) => {
                const hours = event.target.value === "" ? "" : Number(event.target.value);
                patchCustomTest(test.id, { hours }, { goalId, category });
              }}
            />
            <span>hrs</span>
          </label>
          {custom && canEdit ? (
            <button
              type="button"
              className="ua-cfg-goals-icon"
              aria-label="Remove test"
              disabled={busy}
              onClick={() => {
                if (goalId) removeExtraFromCategory(goalId, category, test.id);
                else removeStandaloneCustom(test.id);
              }}
            >
              ×
            </button>
          ) : (
            <span />
          )}
        </div>
      );
    });
  }

  function renderTestEditor(tests, { goalId, category, label, onAdd } = {}) {
    return (
      <div className="ua-cfg-goals-lines ua-cp-ip-test-editor" aria-label={label}>
        <div className="ua-cfg-goals-lines__head" aria-hidden="true">
          <span />
          <span />
          <span>Test</span>
          <span>BM/PM</span>
          <span>Duration</span>
          <span />
        </div>
        {renderTestRows(tests, { goalId, category })}
        {canEdit && onAdd ? (
          <button type="button" className="ua-cfg-goals-add" disabled={busy} onClick={onAdd}>
            + Add test
          </button>
        ) : null}
      </div>
    );
  }

  function renderGroupCard(group, { asGoal = false } = {}) {
    const counts = countGroup(group);
    const allOn = counts.total > 0 && counts.n === counts.total;
    const partial = counts.n > 0 && !allOn;
    const sections = asGoal ? groupTestsByCategory(group.tests) : null;

    return (
      <div key={group.id} className={`ua-cp-ip-test-group${asGoal ? " ua-cp-ip-test-group--goal" : ""}`}>
        <div className="ua-cp-ip-test-group__head">
          <button
            style={{ borderRadius: "5px" }}
            type="button"
            className={`ua-cp-ip-check ua-cp-ip-check--head${allOn || partial ? " ua-cp-ip-check--on" : ""}${partial ? " ua-cp-ip-check--partial" : ""}`}
            onClick={() => toggleGroup(group)}
            disabled={!canEdit || busy}
            aria-label={`Toggle ${group.name}`}
          >
            {allOn ? "✓" : partial ? "−" : ""}
          </button>
          <strong className="ua-cp-ip-test-group__title">{group.name}</strong>
          {asGoal ? <span className="ua-cp-ip-test-group__badge">Goal</span> : null}
          <span className="ua-cp-ip-test-group__count">{counts.n}/{counts.total} selected</span>
          {asGoal && canEdit && extrasToSave(group.id).length ? (
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
              disabled={busy || savingGoal}
              onClick={() => saveToGoal(group.id)}
            >
              {savingGoal ? "Saving…" : "Save to goal"}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="ua-cp-ip-test-group__remove"
              onClick={() => removeGroup(group.id, asGoal ? "goal" : "test")}
              disabled={busy}
              aria-label={asGoal ? "Remove goal" : "Remove test"}
            >
              ×
            </button>
          ) : null}
        </div>
        {asGoal && sections?.length ? (
          sections.map((section) => {
            const extraTests = goalExtras[group.id]?.[section.name] || [];
            return (
              <div key={`${group.id}-${section.name}`} className="ua-cp-ip-goal-section">
                <div className="ua-cp-ip-goal-section__label">{section.name}</div>
                {renderTestEditor([...section.tests, ...extraTests], {
                  goalId: group.id,
                  category: section.name,
                  label: `${group.name} · ${section.name}`,
                  onAdd: () => addCustomToCategory(group.id, section.name),
                })}
              </div>
            );
          })
        ) : (
          renderTestEditor(group.tests, {
            label: `${group.name} tests`,
          })
        )}
      </div>
    );
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
          {canEdit && visibleGoalGroups.some((group) => extrasToSave(group.id).length) ? (
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--outline"
              disabled={busy || savingGoal}
              onClick={() => saveToGoal()}
            >
              {savingGoal ? "Saving…" : "Save to goal"}
            </button>
          ) : null}
          {published ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--muted" disabled>Published</button>
          ) : canEdit ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--green" disabled={busy || savingGoal} onClick={publish}>
              {busy ? "Publishing…" : "Publish"}
            </button>
          ) : null}
          {canExport ? (
            <button type="button" className="ua-cp-btn ua-cp-btn--orange" onClick={downloadList}>↓ Download list</button>
          ) : null}
        </div>
      </div>

      {catalog.length ? (
        published ? (
          <div className="ua-cp-ip-banner ua-cp-ip-banner--sent">
            ✓ Sent to {firstName(user)} on WhatsApp and in the app · {formatDisplayDate(recommended.reportDate)} · {selectedIds.length} tests
          </div>
        ) : (
          <div className="ua-cp-ip-banner">
            Unpublished changes — Save to goal updates the goal catalog without notifying the client. Publish sends the list to {firstName(user)} on WhatsApp and in the app.
          </div>
        )
      ) : null}

      {catalog.length ? (
        <>
          <section className="ua-cp-ip-assign-block">
            <div className="ua-cp-ip-assign-block__head">
              <div>
                <h4 className="ua-cp-ip-assign-block__title">Assign by goal</h4>
                <p className="ua-cp-ip-assign-block__sub">Add tests with + Add test, then Save to goal. That updates the goal without publishing to the client.</p>
              </div>
            </div>
            {goalPresets.length ? (
              <div className="ua-cp-ip-preset">
                <p className="ua-cp-ip-preset__label">Quick add · goal</p>
                <div className="ua-cp-ip-preset__pills">
                  {goalPresets.map((g) => {
                    const applied = pinnedIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className={`ua-cp-ip-preset__pill${applied ? " ua-cp-ip-preset__pill--applied" : ""}`}
                        onClick={() => toggleGoalPreset(g)}
                        disabled={!canEdit || busy}
                        title={applied ? `Remove ${g.name}` : `Add ${g.name}`}
                      >
                        {applied ? `✓ ${g.name}` : `+ ${g.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="ua-cp-ip-assign-history__empty">No active goals yet. Create them under Configs → Goals &amp; Tests.</p>
            )}
            {canEdit && goalGroups.length ? (
              <NamespaceSearch
                groups={visibleGoalGroups}
                namespaces={goalGroups}
                onAdd={addGroup}
                onToast={onToast}
                disabled={busy}
                placeholder="+ Search a goal, e.g. Fat Loss…"
                allAddedLabel="All goals added"
                noMatchLabel="No matching goals"
              />
            ) : null}
            {visibleGoalGroups.length
              ? visibleGoalGroups.map((group) => renderGroupCard(group, { asGoal: true }))
              : goalPresets.length || goalGroups.length
                ? <p className="ua-cp-ip-assign-history__empty">No goals added yet. Use a quick add or search above.</p>
                : null}
          </section>

          <section className="ua-cp-ip-assign-block">
            <div className="ua-cp-ip-assign-block__head">
              <div>
                <h4 className="ua-cp-ip-assign-block__title">Assign individual tests</h4>
                <p className="ua-cp-ip-assign-block__sub">Add or remove single tests without mixing them into goals.</p>
              </div>
            </div>
            {canEdit && testGroups.length ? (
              <NamespaceSearch
                groups={visibleTestGroups}
                namespaces={testGroups}
                onAdd={addGroup}
                onToast={onToast}
                disabled={busy}
                placeholder="+ Search a test, e.g. Glucose Test…"
                allAddedLabel="All tests added"
                noMatchLabel="No matching tests"
              />
            ) : null}
            {visibleTestGroups.length
              ? visibleTestGroups.map((group) => renderGroupCard(group))
              : (
                <p className="ua-cp-ip-assign-history__empty">
                  {testGroups.length
                    ? "No individual tests added yet. Search above to add one."
                    : "No individual tests in the catalog. Use goals above, or add tests under Configs."}
                </p>
              )}
          </section>
        </>
      ) : (
        <p>No live tests in the catalog yet. Add them under Configs → Goals &amp; Tests.</p>
      )}

      <AssignedTestHistory
        userId={user?.id}
        current={recommended}
        history={history}
        onToast={onToast}
        onDelete={onDelete}
        canEdit={canEdit}
        busy={busy}
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
      <div
        className={`ua-cp-ip-ai__val ua-cp-ip-ai__val--${reading.tone}${reading.value === "—" ? " ua-cp-ip-ai__val--empty" : ""}`}
      >
        {reading.value}
      </div>
      {reading.note ? <div className="ua-cp-ip-ai__note">{reading.note}</div> : null}
    </td>
  );
}

function MockReportAnalysisTab({ onToast, canCreate = false }) {
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
          {analysed ? <span className="ua-cp-ip-badge ua-cp-ip-badge--good">AI analysed</span> : null}
          {canCreate ? (
            <button
              type="button"
              className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
              onClick={() => {
                setAnalysed(true);
                onToast(analysed ? "Resubmitting to AI" : "Submitted to AI");
              }}
            >
              ⚡ {analysed ? "Resubmit to AI" : "Submit to AI"}
            </button>
          ) : null}
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
          <span className="ua-cp-ip-tag ua-cp-ip-tag--latest" >Latest</span>
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

function LiveReportAnalysisTab({
  reports,
  busy,
  onAnalyze,
  onSaveAnalysis,
  onToast,
  clientName,
  canEdit = true,
  canCreate = false,
  canExport = true,
  showMarkStepComplete = false,
  stepBusy = false,
  onMarkStepComplete,
}) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id || null);
  const [viewing, setViewing] = useState(null);

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
  const latestAnalysed = findLatestAnalysedReport(reports);
  const latestAnalysis = latestAnalysed?.aiAnalysis;
  const merged = useMemo(() => mergeAnalysedReportsToPanels(reports), [reports]);
  const analysed = merged.dates.length > 0;
  const older = reports.filter(
    (report) => report.id !== latestAnalysed?.id && report.aiStatus === "analysed" && report.aiAnalysis
  );

  const [aiDraft, setAiDraft] = useState(null);
  const [aiEditing, setAiEditing] = useState(false);
  const [bloodSummary, setBloodSummary] = useState(latestAnalysis?.bloodSummary || []);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [protocolItems, setProtocolItems] = useState(latestAnalysis?.protocolItems || []);
  const [protocolDraft, setProtocolDraft] = useState([]);
  const [protocolEditing, setProtocolEditing] = useState(false);
  const [nutritionLatest, setNutritionLatest] = useState(latestAnalysis?.nutritionSummary || "");
  const [nutritionDraft, setNutritionDraft] = useState("");
  const [nutritionEditing, setNutritionEditing] = useState(false);

  useEffect(() => {
    setAiDraft(null);
    setAiEditing(false);
    setBloodSummary(latestAnalysis?.bloodSummary || []);
    setSummaryEditing(false);
    setProtocolItems(latestAnalysis?.protocolItems || []);
    setProtocolEditing(false);
    setNutritionLatest(latestAnalysis?.nutritionSummary || "");
    setNutritionEditing(false);
  }, [latestAnalysed?.id, latestAnalysed?.aiAnalysedAt, latestAnalysed?.updatedAt]);

  if (!selected) {
    const name = clientName || "The client";
    return (
      <div className="ua-cp-ip-report ua-cp-ip-report--empty">
        <div className="ua-cp-ip-report-empty">
          <span className="ua-cp-ip-report-empty__icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 13h6" />
              <path d="M9 17h4" />
            </svg>
          </span>
          <strong>No report submitted yet</strong>
          <p>
            {name} hasn&apos;t uploaded a blood report. They can submit a PDF from Internal Parameters in the app — it will show up here for review and AI analysis.
          </p>
        </div>
      </div>
    );
  }

  const panels = aiEditing && aiDraft ? aiDraft : merged.panels;

  function updateReading(panelIdx, rowIdx, readingIdx, nextReading) {
    setAiDraft((prev) => {
      const next = cloneAiPanels(prev ?? panels);
      next[panelIdx].rows[rowIdx].readings[readingIdx] = nextReading;
      return next;
    });
  }

  async function persistLatest(nextAnalysis, toast) {
    if (!latestAnalysed) return;
    await onSaveAnalysis(latestAnalysed.id, { aiAnalysis: nextAnalysis });
    onToast?.(toast);
  }

  async function persistMergedPanels(nextPanels, toast) {
    for (let colIdx = 0; colIdx < merged.reportIds.length; colIdx += 1) {
      const reportId = merged.reportIds[colIdx];
      const report = reports.find((item) => item.id === reportId);
      if (!report) continue;
      const nextAnalysis = applyMergedPanelsToReportAnalysis(report, nextPanels, colIdx);
      await onSaveAnalysis(reportId, { aiAnalysis: nextAnalysis });
    }
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
                  {index === 0 ? <span className="ua-cp-ip-tag ua-cp-ip-tag--latest" style={{color:"white"}}>Latest</span> : null}
                </strong>
                <span>Added by client · {formatDisplayDate(report.reportDate)} · {reportAiStatusText(report)}</span>
              </div>
              <div className="ua-cp-ip-upload__actions" onClick={(event) => event.stopPropagation()}>
                {report.fileUrl ? (
                  <button
                    type="button"
                    className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
                    onClick={() => setViewing(report)}
                  >
                    View PDF
                  </button>
                ) : null}
                {canExport && report.fileUrl ? (
                  <a className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" href={report.fileUrl} target="_blank" rel="noreferrer">↓ Download</a>
                ) : null}
                {reportAnalysed && report.aiStatus === "analysed" ? (
                  <span className="ua-cp-ip-badge ua-cp-ip-badge--good">AI analysed</span>
                ) : null}
                {canCreate ? (
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
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {selected.aiStatus === "failed" && selected.aiError ? (
        <p className="ua-cp-ip-rec__sub">{selected.aiError}</p>
      ) : null}

      {analysed && showMarkStepComplete ? (
        <div className="ua-cp-ip-banner ua-cp-ip-banner--step">
          <div>
            <strong>Internal Parameters step is still pending</strong>
            <span>Mark this onboarding step complete here, or from At a Glance.</span>
          </div>
          <button
            type="button"
            className="ua-cp-btn ua-cp-btn--green ua-cp-btn--sm"
            disabled={busy || stepBusy}
            onClick={onMarkStepComplete}
          >
            {stepBusy ? "Marking…" : "Mark Step as Completed"}
          </button>
        </div>
      ) : null}

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
                onEdit={() => {
                  setAiDraft(cloneAiPanels(panels));
                  setAiEditing(true);
                }}
                onCancel={() => {
                  setAiDraft(null);
                  setAiEditing(false);
                }}
                onSave={async () => {
                  await persistMergedPanels(aiDraft || panels, "AI interpretation saved");
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
                    <th className="ua-cp-ip-ai__sticky ua-cp-ip-ai__sticky--3">RR · PharmEasy</th>
                    {merged.dates.map((d) => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {panels.map((panel, panelIdx) => (
                    <Fragment key={panel.title}>
                      <tr className="ua-cp-ip-ai__cat">
                        <td colSpan={3 + merged.dates.length}>{panel.title}</td>
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
                  await persistLatest({
                    ...latestAnalysis,
                    bloodSummary: nextSummary,
                    protocolItems,
                    nutritionSummary: nutritionLatest,
                  }, "Blood report summary saved");
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
                <span>AI-generated · {formatDisplayDate(latestAnalysed?.reportDate)}</span>
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
                  await persistLatest({
                    ...latestAnalysis,
                    bloodSummary,
                    protocolItems: nextItems,
                    nutritionSummary: nutritionLatest,
                  }, "Protocol saved");
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
                  await persistLatest({
                    ...latestAnalysis,
                    bloodSummary,
                    protocolItems,
                    nutritionSummary: nextText,
                  }, "Nutrition summary saved");
                  setNutritionLatest(nextText);
                  setNutritionEditing(false);
                }}
              />
            ) : null}
          </div>
          {analysed ? (
            <div className="ua-cp-ip-nutrition__latest">
              <span className="" style={{fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: 'rgb(43, 143, 91)', background: 'rgb(231, 246, 238)', padding: '3px 8px', borderRadius: '5px'}}>Latest</span>
              <span className="ua-cp-ip-nutrition__date">{formatDisplayDate(latestAnalysed?.reportDate)}</span>
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
      <LabReportPdfModal
        open={Boolean(viewing)}
        url={viewing?.fileUrl || ""}
        dateLabel={viewing?.reportDate}
        clientName={clientName}
        onClose={() => setViewing(null)}
        onToast={onToast}
      />
    </div>
  );
}

export function InternalParametersSection({ user, onToast, onUserUpdated }) {
  const { can } = useViewAs();
  const { canEdit, canCreate, canExport } = useClientSectionPermissions("internal");
  const canEditOnboarding = can("console.cl.edit");
  const [tab, setTab] = useState("tests");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmptyOpen, setHistoryEmptyOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissionLocked, setSubmissionLocked] = useState(
    user?.labReportSubmissionLocked === true
      ? true
      : user?.labReportSubmissionLocked === false
        ? false
        : null,
  );
  const [submissionBusy, setSubmissionBusy] = useState(false);

  const userId = user?.id;
  const live = Boolean(userId && !/^\d+$/.test(String(userId)));
  const stepStatus = String(user?.paidOnboardingStepStatus?.internalParameter || "pending").toLowerCase();
  const internalStepPending =
    !user?.paidOnboardingCompleted
    && stepStatus !== "done"
    && stepStatus !== "skipped";

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
      const nextReports = Array.isArray(labs.value?.reports) ? labs.value.reports : [];
      setReports(nextReports);
      if (typeof labs.value?.submissionLocked === "boolean") {
        setSubmissionLocked(labs.value.submissionLocked);
      } else {
        setSubmissionLocked(nextReports.length > 0);
      }
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

  async function handleReloadCatalog() {
    if (!live) return;
    const tests = await fetchTestCatalog(userId);
    const list = Array.isArray(tests) ? tests : tests?.tests || [];
    setCatalog(list);
  }

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

  async function handleDeleteReport(reportId) {
    try {
      setBusy(true);
      await deleteUserLabReport(userId, reportId);
      onToast?.("Blood report deleted");
      await reload();
    } catch (err) {
      onToast?.(err?.message || "Failed to delete blood report");
    } finally {
      setBusy(false);
    }
  }

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

  async function handleMarkStepComplete() {
    if (!userId || !live) return;
    setStepBusy(true);
    try {
      const data = await patchOnboardingStep(userId, "internalParameter", "done");
      const nextStatus = data?.paidOnboardingStepStatus || {
        ...user.paidOnboardingStepStatus,
        internalParameter: "done",
      };
      onUserUpdated?.({
        ...user,
        paidOnboardingStepStatus: nextStatus,
        paidOnboardingCompleted: Boolean(data?.paidOnboardingCompleted),
      });
      onToast?.("Internal Parameters marked complete");
    } catch (err) {
      onToast?.(err?.message || "Failed to mark step complete");
    } finally {
      setStepBusy(false);
    }
  }

  async function handleSubmissionEnabled(enabled) {
    if (!userId || !live) return;
    const previous = submissionLocked;
    setSubmissionLocked(!enabled);
    setSubmissionBusy(true);
    try {
      const locked = await updateUserLabReportSubmission(userId, enabled);
      setSubmissionLocked(locked);
      onUserUpdated?.({ ...user, labReportSubmissionLocked: locked });
      onToast?.(enabled
        ? "Client can submit a new report in the app"
        : "Client report upload disabled in the app");
    } catch (err) {
      setSubmissionLocked(previous);
      onToast?.(err?.message || "Failed to update client report upload");
    } finally {
      setSubmissionBusy(false);
    }
  }

  async function handleDeleteRecommendation(recommendationId) {
    try {
      setBusy(true);
      await deleteUserTestRecommendation(userId, recommendationId);
      onToast?.("Recommended test list deleted");
      await reload();
    } catch (err) {
      onToast?.(err?.message || "Failed to delete recommended tests");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(payload) {
    try {
      setBusy(true);
      const result = await createUserTestRecommendation(userId, payload);
      const wa = result?.whatsapp;
      if (wa?.sent) {
        onToast?.(`Test list sent to ${firstName(user)} on WhatsApp and in the app`);
      } else if (wa && !wa.sent) {
        onToast?.(`Test list sent in the app · WhatsApp skipped (${wa.reason || "not sent"})`);
      } else {
        onToast?.(`Test list sent to ${firstName(user)} in the app`);
      }
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
  const historyCount = live ? reports.length : INTERNAL_PARAMS.reportHistory.length;

  function handleToggleHistory() {
    if (historyCount === 0) {
      setHistoryOpen(false);
      setHistoryEmptyOpen(true);
      return;
    }
    setHistoryEmptyOpen(false);
    setHistoryOpen((open) => !open);
  }

  return (
    <div className="ua-cp-section ua-cp-internal">
      <div className="ua-cp-ip-head">
        <div>
          <h2 className="ua-cp-ip-head__title">Internal parameters</h2>
          <p className="ua-cp-ip-head__sub">Coach-recommended blood tests, report uploads, and reviewed results.</p>
        </div>
        {live ? (
          <div
            className={`ua-cp-ip-submit${submissionLocked ? " ua-cp-ip-submit--locked" : ""}`}
            title={submissionLocked
              ? "The client cannot submit or update a blood report in the app. Turn this on to allow a new upload."
              : "The client can submit a blood report in the app. Turn this off to disable new uploads."}
          >
            <div className="ua-cp-ip-submit__text">
              <span className="ua-cp-ip-submit__label">Client report upload</span>
              <span className="ua-cp-ip-submit__status">
                {submissionLocked ? "Disabled in the app" : "Allowed in the app"}
              </span>
            </div>
            <button
              type="button"
              className={`ua-toggle${submissionLocked ? "" : " ua-toggle--on"}`}
              aria-pressed={!submissionLocked}
              aria-label={submissionLocked ? "Allow the client to upload a new report" : "Disable new report uploads in the app"}
              disabled={submissionBusy || !canEdit}
              onClick={() => handleSubmissionEnabled(submissionLocked)}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        ) : null}
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
          historyCount={historyCount}
          historyOpen={historyOpen}
          onToggleHistory={handleToggleHistory}
        />
      ) : (
        <SummaryCards
          lastReport={INTERNAL_PARAMS.lastReport}
          nextDue={INTERNAL_PARAMS.nextDue}
          alertText={INTERNAL_PARAMS.outOfRangeAlert}
          historyCount={historyCount}
          historyOpen={historyOpen}
          onToggleHistory={handleToggleHistory}
        />
      )}

      {historyEmptyOpen ? (
        <ReportHistoryEmptyModal
          clientName={firstName(user)}
          onClose={() => setHistoryEmptyOpen(false)}
        />
      ) : null}

      {historyOpen && historyCount > 0 ? (
        live ? (
          <LiveReportHistory
            reports={reports}
            busy={busy}
            onToast={onToast}
            onReview={handleReview}
            onDelete={handleDeleteReport}
            canEdit={canEdit}
          />
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
            onDelete={handleDeleteRecommendation}
            onReloadCatalog={handleReloadCatalog}
            canEdit={canEdit}
            canExport={canExport}
          />
        ) : (
          <MockRecommendedTestsTab user={user} onToast={onToast} canEdit={canEdit} canExport={canExport} />
        )
      ) : live ? (
        <LiveReportAnalysisTab
          reports={reports}
          busy={busy}
          onAnalyze={handleAnalyze}
          onSaveAnalysis={handleSaveAnalysis}
          onToast={onToast}
          clientName={firstName(user)}
          canEdit={canEdit}
          canCreate={canCreate}
          canExport={canExport}
          showMarkStepComplete={internalStepPending && canEditOnboarding}
          stepBusy={stepBusy}
          onMarkStepComplete={handleMarkStepComplete}
        />
      ) : (
        <MockReportAnalysisTab onToast={onToast} canCreate={canCreate} />
      )}
    </div>
  );
}
