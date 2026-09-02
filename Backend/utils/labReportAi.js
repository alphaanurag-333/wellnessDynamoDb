const TONES = new Set(["good", "bad", "warn", "neutral"]);

function formatAiDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "").trim() || "—";
  return date
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
    .replace(/ /g, " ")
    .toUpperCase();
}

function stripCodeFence(text) {
  let raw = String(text || "").replace(/^\uFEFF/, "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) raw = fenced[1].trim();
  return raw;
}

function extractBalancedJsonObject(text) {
  const start = String(text || "").indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractAllBalancedJsonObjects(text) {
  const found = [];
  const src = String(text || "");
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf("{", i);
    if (start < 0) break;
    const obj = extractBalancedJsonObject(src.slice(start));
    if (!obj) {
      i = start + 1;
      continue;
    }
    found.push(obj);
    i = start + obj.length;
  }
  return found;
}

function scoreParsedObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return 0;
  if ("related" in obj || "proteinGm" in obj || "caloriesKcal" in obj) return 3;
  if ("panels" in obj || "bloodSummary" in obj) return 2;
  return 1;
}

function parseAiJson(text) {
  const raw = stripCodeFence(text);
  if (!raw) {
    const err = new Error("AI returned an empty response");
    err.name = "AiParseError";
    throw err;
  }

  const candidates = [];
  const seen = new Set();
  const add = (value) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  add(raw);
  for (const obj of extractAllBalancedJsonObjects(raw)) add(obj);

  const parsedObjects = [];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        const firstObject = parsed.find((item) => item && typeof item === "object" && !Array.isArray(item));
        if (firstObject) parsedObjects.push(firstObject);
        continue;
      }
      if (parsed && typeof parsed === "object") parsedObjects.push(parsed);
    } catch {
      /* try next */
    }
  }

  if (!parsedObjects.length) {
    const err = new Error("AI did not return valid JSON");
    err.name = "AiParseError";
    throw err;
  }

  return parsedObjects.reduce((best, obj) =>
    scoreParsedObject(obj) >= scoreParsedObject(best) ? obj : best
  );
}

function normalizeTone(value) {
  const tone = String(value || "").trim().toLowerCase();
  if (tone === "warning" || tone === "caution") return "warn";
  if (tone === "ok" || tone === "normal" || tone === "in-range") return "good";
  if (tone === "high" || tone === "low" || tone === "out-of-range" || tone === "critical") return "bad";
  return TONES.has(tone) ? tone : "neutral";
}

function asStringList(value, { max = 12, maxLen = 400 } = {}) {
  if (!Array.isArray(value)) {
    const text = String(value || "").trim();
    return text ? [text.slice(0, maxLen)] : [];
  }
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max)
    .map((item) => item.slice(0, maxLen));
}

function normalizeRow(row) {
  const name = String(row?.name || row?.parameter || "").trim();
  if (!name) return null;
  const value = String(row?.value ?? row?.reading ?? "—").trim() || "—";
  return {
    name: name.slice(0, 80),
    optimal: String(row?.optimal || "—").trim().slice(0, 80) || "—",
    rr: String(row?.rr || row?.referenceRange || row?.reference || "—").trim().slice(0, 80) || "—",
    value: value.slice(0, 40),
    tone: normalizeTone(row?.tone),
    note: String(row?.note || row?.interpretation || "").trim().slice(0, 800),
  };
}

function normalizePanel(panel) {
  const title = String(panel?.title || panel?.name || "Other").trim().slice(0, 80) || "Other";
  const rows = (Array.isArray(panel?.rows) ? panel.rows : [])
    .map(normalizeRow)
    .filter(Boolean)
    .slice(0, 40);
  if (!rows.length) return null;
  return { title: title.toUpperCase(), rows };
}

function normalizeAiAnalysis(raw, { reportDate } = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const panels = (Array.isArray(source.panels) ? source.panels : [])
    .map(normalizePanel)
    .filter(Boolean)
    .slice(0, 20);

  if (!panels.length) {
    const err = new Error("AI could not extract any markers from this report");
    err.name = "AiParseError";
    throw err;
  }

  return {
    dateLabel: formatAiDateLabel(reportDate),
    panels,
    bloodSummary: asStringList(source.bloodSummary || source.summary),
    protocolItems: asStringList(source.protocolItems || source.protocol),
    nutritionSummary: String(source.nutritionSummary || "").trim().slice(0, 1200),
  };
}

function buildLabReportAiPrompt({ reportDate }) {
  const dateHint = reportDate ? ` Report date: ${reportDate}.` : "";
  return [
    "You are a clinical nutrition coach reading a client's uploaded blood / lab report PDF (often a scan).",
    "Extract every test marker that is actually present in THIS document. Do not invent values that are not on the report.",
    "If a field is missing, use value \"—\" and tone \"neutral\".",
    "Use the report's own reference range when shown; otherwise use common adult Indian lab ranges.",
    "Optimal is the tighter wellness target (not the lab reference range).",
    "Tone: good (in optimal / in range), warn (borderline), bad (out of range), neutral (not reported).",
    "Write interpretation notes in plain English for a wellness coach. No diagnosis, no medication prescriptions.",
    `Return JSON only with this shape:${dateHint}`,
    JSON.stringify({
      panels: [
        {
          title: "GLUCOSE PANEL",
          rows: [
            {
              name: "HbA1c",
              optimal: "5 – 5.3%",
              rr: "Below 5.7%",
              value: "6.8",
              tone: "bad",
              note: "Short coach-facing interpretation of this marker.",
            },
          ],
        },
      ],
      bloodSummary: ["3–8 bullets synthesising the latest panel"],
      protocolItems: ["4–8 nutrition / lifestyle recommendations a coach can action"],
      nutritionSummary: "One short paragraph for the nutrition summary card.",
    }),
  ].join("\n");
}

function analysisToPanels(aiAnalysis) {
  const dateLabel = aiAnalysis?.dateLabel || "—";
  return {
    dates: [dateLabel],
    panels: (aiAnalysis?.panels || []).map((panel) => ({
      title: panel.title,
      rows: (panel.rows || []).map((row) => ({
        name: row.name,
        optimal: row.optimal,
        rr: row.rr,
        readings: [{ value: row.value, tone: row.tone, note: row.note }],
      })),
    })),
  };
}

function panelsToAnalysis(panels, { dateLabel, bloodSummary, protocolItems, nutritionSummary } = {}) {
  const first = Array.isArray(panels) ? panels : [];
  return {
    dateLabel: dateLabel || "—",
    panels: first.map((panel) => ({
      title: panel.title,
      rows: (panel.rows || []).map((row) => {
        const reading = row.readings?.[0] || {};
        return {
          name: row.name,
          optimal: row.optimal,
          rr: row.rr,
          value: reading.value ?? "—",
          tone: normalizeTone(reading.tone),
          note: reading.note || "",
        };
      }),
    })),
    bloodSummary: asStringList(bloodSummary),
    protocolItems: asStringList(protocolItems),
    nutritionSummary: String(nutritionSummary || "").trim().slice(0, 1200),
  };
}

function reportSortKey(report) {
  const date = new Date(report?.reportDate || report?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeMarkerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizePanelKey(title) {
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

function mergeAnalysedReportsToPanels(reports, { maxDates = 4 } = {}) {
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

function applyMergedPanelsToReportAnalysis(report, mergedPanels, columnIndex) {
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

module.exports = {
  formatAiDateLabel,
  parseAiJson,
  normalizeTone,
  normalizeAiAnalysis,
  buildLabReportAiPrompt,
  analysisToPanels,
  panelsToAnalysis,
  mergeAnalysedReportsToPanels,
  applyMergedPanelsToReportAnalysis,
  normalizeMarkerKey,
  normalizePanelKey,
};
