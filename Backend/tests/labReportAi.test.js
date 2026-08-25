const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAiJson,
  normalizeAiAnalysis,
  normalizeTone,
  formatAiDateLabel,
  panelsToAnalysis,
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
