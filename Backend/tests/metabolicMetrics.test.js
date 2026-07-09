const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeBmi,
  computeBmr,
  computeBodyFat,
  computeVisceralFat,
  computeFattyLiverIndex,
  getFliRiskCategory,
  buildFattyLiverSnapshot,
  buildMetricSnapshot,
  buildDashboardFromLogs,
} = require("../utils/metabolicMetricsCalculations");

test("computeBmi returns expected value", () => {
  assert.equal(computeBmi(175, 70), 22.9);
});

test("computeBmr uses Mifflin-St Jeor", () => {
  const bmr = computeBmr({ gender: "male", age: 28, heightCm: 175, weightKg: 70 });
  assert.equal(bmr, 1659);
});

test("computeBodyFat for male", () => {
  const result = computeBodyFat({
    gender: "male",
    heightCm: 175,
    neckCm: 38,
    waistCm: 85,
    hipCm: 95,
  });
  assert.ok(result);
  assert.ok(result.bodyFatPercent > 0);
  assert.equal(result.leanMuscleMassPercent + result.bodyFatPercent, 100);
});

test("computeVisceralFat returns risk assessment", () => {
  const result = computeVisceralFat({
    gender: "male",
    age: 28,
    heightCm: 175,
    waistCm: 93,
  });
  assert.ok(result.waistHeightRatio > 0);
  assert.ok(result.estimatedVisceralFat >= 1);
  assert.ok(result.riskAssessment);
});

test("computeFattyLiverIndex returns expected value", () => {
  const fli = computeFattyLiverIndex({
    bmi: 28,
    waistCm: 95,
    triglycerides: 150,
    ggt: 45,
  });
  assert.ok(fli != null);
  assert.ok(fli > 0);
});

test("getFliRiskCategory maps risk bands", () => {
  assert.equal(getFliRiskCategory(20).label, "Low risk");
  assert.equal(getFliRiskCategory(45).label, "Indeterminate");
  assert.equal(getFliRiskCategory(70).label, "High risk");
});

test("buildFattyLiverSnapshot stores fli risk", () => {
  const snapshot = buildFattyLiverSnapshot({
    bmi: 28,
    waistCm: 95,
    triglycerides: 150,
    ggt: 45,
  });
  assert.equal(snapshot.metricType, "fatty_liver");
  assert.ok(snapshot.fli > 0);
  assert.ok(snapshot.fliRiskLabel);
});

test("buildMetricSnapshot stores bmi category", () => {
  const snapshot = buildMetricSnapshot("bmi", {
    gender: "male",
    age: 28,
    heightCm: 175,
    weightKg: 86,
  });
  assert.equal(snapshot.metricType, "bmi");
  assert.equal(snapshot.bmi, 28.1);
  assert.equal(snapshot.bmiCategory, "Overweight");
});

test("buildDashboardFromLogs groups latest metrics", () => {
  const dashboard = buildDashboardFromLogs(
    [
      {
        id: "1",
        metricType: "bmi",
        bmi: 28.1,
        bmiCategory: "Overweight",
        recordedAt: "2026-07-07T12:00:00.000Z",
      },
      {
        id: "2",
        metricType: "bmr",
        bmr: 1540,
        tdee: 2100,
        activityLevel: "moderately_active",
        recordedAt: "2026-07-06T12:00:00.000Z",
      },
      {
        id: "3",
        metricType: "fatty_liver",
        fli: 42.5,
        triglycerides: 150,
        ggt: 45,
        bmi: 28,
        waistCm: 95,
        fliRiskLabel: "Indeterminate",
        fliRiskColor: "#f59e0b",
        recordedAt: "2026-07-05T12:00:00.000Z",
      },
    ],
    { formatChartDate: () => "7Jul26" }
  );

  assert.equal(dashboard.bmi.current.value, 28.1);
  assert.equal(dashboard.bmr.current.value, 1540);
  assert.equal(dashboard.tdee.current.value, 2100);
  assert.equal(dashboard.fattyLiver.current.value, 42.5);
  assert.equal(dashboard.fattyLiver.history.length, 1);
});
