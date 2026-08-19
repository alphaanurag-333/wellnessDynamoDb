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
  const raw = String(text || "").trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : raw).trim();
}

function parseAiJson(text) {
  const raw = stripCodeFence(text);
  if (!raw) {
    const err = new Error("AI returned an empty response");
    err.name = "AiParseError";
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    const err = new Error("AI did not return valid JSON");
    err.name = "AiParseError";
    throw err;
  }
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

module.exports = {
  formatAiDateLabel,
  parseAiJson,
  normalizeTone,
  normalizeAiAnalysis,
  buildLabReportAiPrompt,
  analysisToPanels,
  panelsToAnalysis,
};
