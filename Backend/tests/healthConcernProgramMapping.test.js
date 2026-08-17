const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  findProgramForConcern,
} = require("../services/adminHealConversionService");

const programs = [
  { id: "general", title: "Seek to Heal — 90-Day Transformation" },
  { id: "diabetes", title: "Diabetes Reversal Program — 12 Weeks" },
  { id: "weight", title: "Sustainable Weight Loss — 90 Days" },
  { id: "pcos", title: "PCOS & Hormonal Balance Program" },
  { id: "thyroid", title: "Thyroid Wellness Program" },
  { id: "gut", title: "Gut Reset & Digestive Healing" },
  { id: "heart", title: "Heart Health & Lipid Management" },
];

test("findProgramForConcern maps supported health concerns deterministically", () => {
  assert.equal(findProgramForConcern(programs, "Diabetes reversal")?.id, "diabetes");
  assert.equal(findProgramForConcern(programs, "Fat loss")?.id, "weight");
  assert.equal(findProgramForConcern(programs, "PCOD / PCOS")?.id, "pcos");
  assert.equal(findProgramForConcern(programs, "Thyroid")?.id, "thyroid");
  assert.equal(findProgramForConcern(programs, "Gut health")?.id, "gut");
  assert.equal(findProgramForConcern(programs, "Hypertension")?.id, "heart");
  assert.equal(findProgramForConcern(programs, "Overall wellbeing")?.id, "general");
});

test("findProgramForConcern does not fall back to an unrelated first program", () => {
  assert.equal(findProgramForConcern(programs, "Joint mobility"), null);
  assert.equal(findProgramForConcern(programs, ""), null);
});
