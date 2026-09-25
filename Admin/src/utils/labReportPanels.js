function reportSortKey(report) {
  const date = new Date(report?.reportDate || report?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatAiDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "").trim() || "—";
  return date
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
    .replace(/ /g, " ")
    .toUpperCase();
}

function normalizeTone(value) {
  const tone = String(value || "").trim().toLowerCase();
  if (tone === "warning" || tone === "caution") return "warn";
  if (tone === "ok" || tone === "normal" || tone === "in-range") return "good";
  if (tone === "high" || tone === "low" || tone === "out-of-range" || tone === "critical") return "bad";
  if (tone === "good" || tone === "bad" || tone === "warn" || tone === "neutral") return tone;
  return "neutral";
}

export function normalizeMarkerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizePanelKey(title) {
  return String(title || "").trim().toUpperCase();
}

function isNonEmptyMeta(value) {
  const text = String(value || "").trim();
  return Boolean(text && text !== "—");
}

function emptyMergedReading(reportId) {
  return { value: "—", tone: "neutral", note: "", reportId: reportId || null };
}

function collectOrderedKeys(analysed, getPanels, getKey) {
  const keys = [];
  const seen = new Set();
  [...analysed].reverse().forEach((report) => {
    getPanels(report).forEach((item) => {
      const key = getKey(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    });
  });
  return keys;
}

export function findLatestAnalysedReport(reports) {
  return (reports || [])
    .filter((report) => report?.aiStatus === "analysed" && report?.aiAnalysis?.panels?.length)
    .sort((a, b) => reportSortKey(b) - reportSortKey(a))[0] || null;
}

export function mergeAnalysedReportsToPanels(reports, { maxDates = 4 } = {}) {
  const analysed = (reports || [])
    .filter((report) => report?.aiStatus === "analysed" && report?.aiAnalysis?.panels?.length)
    .sort((a, b) => reportSortKey(b) - reportSortKey(a))
    .slice(0, maxDates)
    .sort((a, b) => reportSortKey(a) - reportSortKey(b));

  if (!analysed.length) {
    return { dates: [], panels: [], reportIds: [] };
  }

  const reportIds = analysed.map((report) => report.id);
  const dates = analysed.map(
    (report) => report.aiAnalysis?.dateLabel || formatAiDateLabel(report.reportDate)
  );

  const panelKeys = collectOrderedKeys(
    analysed,
    (report) => report.aiAnalysis.panels || [],
    (panel) => normalizePanelKey(panel.title)
  );

  const panelMap = new Map();
  panelKeys.forEach((panelKey) => {
    panelMap.set(panelKey, { title: panelKey, rowMap: new Map() });
  });

  analysed.forEach((report, colIdx) => {
    (report.aiAnalysis.panels || []).forEach((panel) => {
      const panelKey = normalizePanelKey(panel.title);
      if (!panelMap.has(panelKey)) {
        panelMap.set(panelKey, { title: panel.title || panelKey, rowMap: new Map() });
      }
      const panelEntry = panelMap.get(panelKey);
      panelEntry.title = panel.title || panelEntry.title;

      (panel.rows || []).forEach((row) => {
        const markerKey = normalizeMarkerKey(row.name);
        if (!markerKey) return;
        if (!panelEntry.rowMap.has(markerKey)) {
          panelEntry.rowMap.set(markerKey, {
            name: row.name,
            optimal: "—",
            rr: "—",
            readings: reportIds.map((id) => emptyMergedReading(id)),
          });
        }
        const rowEntry = panelEntry.rowMap.get(markerKey);
        rowEntry.readings[colIdx] = {
          value: row.value ?? "—",
          tone: normalizeTone(row.tone),
          note: row.note || "",
          reportId: report.id,
        };
      });
    });
  });

  const panels = panelKeys.map((panelKey) => {
    const panelEntry = panelMap.get(panelKey);
    const rowKeys = collectOrderedKeys(
      analysed,
      (report) => (report.aiAnalysis.panels || []).find((panel) => normalizePanelKey(panel.title) === panelKey)?.rows || [],
      (row) => normalizeMarkerKey(row.name)
    );

    const rows = rowKeys.map((markerKey) => {
      const rowEntry = panelEntry.rowMap.get(markerKey);
      if (!rowEntry) return null;

      for (let i = analysed.length - 1; i >= 0; i -= 1) {
        const report = analysed[i];
        const panel = (report.aiAnalysis.panels || []).find(
          (item) => normalizePanelKey(item.title) === panelKey
        );
        const sourceRow = (panel?.rows || []).find(
          (item) => normalizeMarkerKey(item.name) === markerKey
        );
        if (!sourceRow) continue;
        if (isNonEmptyMeta(sourceRow.optimal)) rowEntry.optimal = sourceRow.optimal;
        if (isNonEmptyMeta(sourceRow.rr)) rowEntry.rr = sourceRow.rr;
        rowEntry.name = sourceRow.name || rowEntry.name;
      }

      return {
        name: rowEntry.name,
        optimal: rowEntry.optimal,
        rr: rowEntry.rr,
        readings: rowEntry.readings,
      };
    }).filter(Boolean);

    return { title: panelEntry.title, rows };
  }).filter((panel) => panel.rows.length);

  return { dates, panels, reportIds };
}

export function applyMergedPanelsToReportAnalysis(report, mergedPanels, columnIndex) {
  const existing = report?.aiAnalysis;
  if (!existing?.panels?.length) return existing;

  const updatedPanels = existing.panels.map((panel) => {
    const mergedPanel = mergedPanels.find(
      (item) => normalizePanelKey(item.title) === normalizePanelKey(panel.title)
    );
    if (!mergedPanel) return panel;

    return {
      ...panel,
      rows: panel.rows.map((row) => {
        const mergedRow = mergedPanel.rows.find(
          (item) => normalizeMarkerKey(item.name) === normalizeMarkerKey(row.name)
        );
        if (!mergedRow) return row;
        const reading = mergedRow.readings?.[columnIndex];
        if (!reading) return row;
        return {
          ...row,
          optimal: isNonEmptyMeta(mergedRow.optimal) ? mergedRow.optimal : row.optimal,
          rr: isNonEmptyMeta(mergedRow.rr) ? mergedRow.rr : row.rr,
          value: reading.value ?? "—",
          tone: normalizeTone(reading.tone),
          note: reading.note || "",
        };
      }),
    };
  });

  return { ...existing, panels: updatedPanels };
}
