const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractFattyLiverLabsFromAnalysis,
} = require("../utils/fattyLiverLabMarkers");
const {
  computeFattyLiverIndex,
  getFliRiskCategory,
  triglyceridesMgDlForFli,
} = require("../utils/metabolicMetricsCalculations");

test("triglyceridesMgDlForFli keeps mg/dL and converts mmol/L", () => {
  assert.equal(triglyceridesMgDlForFli(116), 116);
  assert.ok(Math.abs(triglyceridesMgDlForFli(1.31) - 116) < 1);
});

test("extractFattyLiverLabsFromAnalysis finds GGT and triglycerides", () => {
  const labs = extractFattyLiverLabsFromAnalysis({
    panels: [
      {
        title: "LIPID PROFILE",
        rows: [{ name: "TRIG", value: "171 mg/dL" }],
      },
      {
        title: "LFT",
        rows: [{ name: "GAMMA GLUTAMYL TRANSFERASE (GGT)", value: "38 U/L" }],
      },
    ],
  });
  assert.equal(labs.triglycerides, 171);
  assert.equal(labs.ggt, 38);
});

test("computeFattyLiverIndex matches MDCalc for Nilesh-style inputs", () => {
  const fli = computeFattyLiverIndex({
    bmi: 26.1,
    waistCm: 96,
    triglycerides: 116,
    ggt: 16,
  });
  assert.ok(fli >= 37 && fli <= 39);
  assert.equal(getFliRiskCategory(fli).label, "Indeterminate");
});

test("computeFattyLiverIndex is stable for a fixed input set", () => {
  const fli = computeFattyLiverIndex({
    bmi: 30,
    waistCm: 102,
    triglycerides: 177,
    ggt: 40,
  });
  assert.ok(fli > 0);
});
