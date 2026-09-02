const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAiJson,
  normalizeAiAnalysis,
  normalizeTone,
  formatAiDateLabel,
  panelsToAnalysis,
  mergeAnalysedReportsToPanels,
  applyMergedPanelsToReportAnalysis,
  normalizeMarkerKey,
} = require("../utils/labReportAi");

test("parseAiJson reads fenced JSON", () => {
  const parsed = parseAiJson('```json\n{"panels":[]}\n```');
  assert.deepEqual(parsed, { panels: [] });
});

test("parseAiJson prefers meal JSON after thinking text", () => {
  const parsed = parseAiJson(
    'Reasoning { "scratch": true } then answer {"related":true,"proteinGm":12,"caloriesKcal":180}'
  );
  assert.equal(parsed.related, true);
  assert.equal(parsed.proteinGm, 12);
});

test("normalizeTone maps aliases", () => {
  assert.equal(normalizeTone("warning"), "warn");
  assert.equal(normalizeTone("out-of-range"), "bad");
  assert.equal(normalizeTone("ok"), "good");
  assert.equal(normalizeTone("mystery"), "neutral");
});

test("normalizeAiAnalysis keeps extracted markers", () => {
  const analysis = normalizeAiAnalysis(
    {
      panels: [
        {
          title: "Glucose panel",
          rows: [{ name: "HbA1c", value: "6.8", tone: "high", note: "Elevated", rr: "< 5.7%" }],
        },
      ],
      bloodSummary: ["HbA1c is high"],
      protocolItems: ["Lower evening carbs"],
      nutritionSummary: "Keep low-GI dinners.",
    },
    { reportDate: "2026-07-20" }
  );

  assert.equal(analysis.panels[0].title, "GLUCOSE PANEL");
  assert.equal(analysis.panels[0].rows[0].name, "HbA1c");
  assert.equal(analysis.panels[0].rows[0].tone, "bad");
  assert.equal(analysis.bloodSummary[0], "HbA1c is high");
  assert.match(formatAiDateLabel("2026-07-20"), /JUL/);
});

test("normalizeAiAnalysis rejects empty panels", () => {
  assert.throws(() => normalizeAiAnalysis({ panels: [] }), /could not extract/);
});

test("panelsToAnalysis round-trips coach edits", () => {
  const saved = panelsToAnalysis(
    [
      {
        title: "LIPID PROFILE",
        rows: [{ name: "LDL", optimal: "< 100", rr: "< 100", readings: [{ value: "148", tone: "bad", note: "High" }] }],
      },
    ],
    { dateLabel: "20 JUL 26", bloodSummary: ["LDL high"], protocolItems: ["Walk daily"], nutritionSummary: "Cut fried food." }
  );
  assert.equal(saved.panels[0].rows[0].value, "148");
  assert.equal(saved.protocolItems[0], "Walk daily");
});

test("normalizeMarkerKey matches HOMA-IR variants", () => {
  assert.equal(normalizeMarkerKey("HOMA-IR 2"), normalizeMarkerKey("HOMA IR 2"));
});

test("mergeAnalysedReportsToPanels merges up to four chronological dates", () => {
  const reports = [
    {
      id: "r4",
      aiStatus: "analysed",
      reportDate: "2026-05-05",
      aiAnalysis: {
        dateLabel: "5 MAY 26",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "9.1", tone: "bad", note: "Latest note" }],
        }],
      },
    },
    {
      id: "r3",
      aiStatus: "analysed",
      reportDate: "2026-05-04",
      aiAnalysis: {
        dateLabel: "4 MAY 26",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "10.2", tone: "bad", note: "Mid note" }],
        }],
      },
    },
    {
      id: "r2",
      aiStatus: "analysed",
      reportDate: "2026-03-02",
      aiAnalysis: {
        dateLabel: "2 MAR 26",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "6.5", tone: "bad", note: "Earlier note" }],
        }],
      },
    },
    {
      id: "r1",
      aiStatus: "analysed",
      reportDate: "2025-12-14",
      aiAnalysis: {
        dateLabel: "14 DEC 25",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "8.4", tone: "bad", note: "Oldest note" }],
        }],
      },
    },
    {
      id: "r0",
      aiStatus: "analysed",
      reportDate: "2025-06-01",
      aiAnalysis: {
        dateLabel: "1 JUN 25",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "7.0", tone: "bad", note: "Too old" }],
        }],
      },
    },
  ];

  const merged = mergeAnalysedReportsToPanels(reports, { maxDates: 4 });
  assert.deepEqual(merged.dates, ["14 DEC 25", "2 MAR 26", "4 MAY 26", "5 MAY 26"]);
  assert.deepEqual(merged.reportIds, ["r1", "r2", "r3", "r4"]);
  assert.equal(merged.panels[0].rows[0].readings[0].value, "8.4");
  assert.equal(merged.panels[0].rows[0].readings[3].note, "Latest note");
});

test("mergeAnalysedReportsToPanels fills missing markers with dashes", () => {
  const merged = mergeAnalysedReportsToPanels([
    {
      id: "a",
      aiStatus: "analysed",
      reportDate: "2026-01-01",
      aiAnalysis: {
        dateLabel: "1 JAN 26",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "8.4", tone: "bad", note: "High" }],
        }],
      },
    },
    {
      id: "b",
      aiStatus: "analysed",
      reportDate: "2026-02-01",
      aiAnalysis: {
        dateLabel: "1 FEB 26",
        panels: [{
          title: "GLUCOSE PANEL",
          rows: [{ name: "FBS", optimal: "80 – 88 mg/dl", rr: "70–100 mg/dl", value: "131", tone: "bad", note: "Fasting high" }],
        }],
      },
    },
  ]);

  assert.equal(merged.panels[0].rows.length, 2);
  const hba1c = merged.panels[0].rows.find((row) => row.name === "HbA1c");
  assert.equal(hba1c.readings[1].value, "—");
  assert.equal(hba1c.readings[1].note, "");
});

test("applyMergedPanelsToReportAnalysis writes edited column back to one report", () => {
  const report = {
    id: "r2",
    aiStatus: "analysed",
    reportDate: "2026-03-02",
    aiAnalysis: {
      dateLabel: "2 MAR 26",
      panels: [{
        title: "GLUCOSE PANEL",
        rows: [{ name: "HbA1c", optimal: "5 – 5.3%", rr: "Below 5.7%", value: "6.5", tone: "bad", note: "Old" }],
      }],
    },
  };

  const mergedPanels = [{
    title: "GLUCOSE PANEL",
    rows: [{
      name: "HbA1c",
      optimal: "5 – 5.3%",
      rr: "Below 5.7%",
      readings: [
        { value: "8.4", tone: "bad", note: "A", reportId: "r1" },
        { value: "7.0", tone: "bad", note: "Edited", reportId: "r2" },
      ],
    }],
  }];

  const updated = applyMergedPanelsToReportAnalysis(report, mergedPanels, 1);
  assert.equal(updated.panels[0].rows[0].value, "7.0");
  assert.equal(updated.panels[0].rows[0].note, "Edited");
});
