const { test } = require("node:test");
const assert = require("node:assert/strict");
const { typesEquivalent } = require("../utils/programTestimonialType");

test("typesEquivalent maps health-concern slugs to program page types", () => {
  assert.equal(typesEquivalent("pcod_pcos", "pcod_pcos_reversal"), true);
  assert.equal(typesEquivalent("PCOD / PCOS", "pcod_pcos_reversal"), true);
  assert.equal(typesEquivalent("thyroid", "thyroid_care"), true);
  assert.equal(typesEquivalent("diabetes_reversal", "diabetes_reversal"), true);
  assert.equal(typesEquivalent("gut", "gut_health"), true);
});

test("typesEquivalent does not mix unrelated programs", () => {
  assert.equal(typesEquivalent("pcod_pcos", "diabetes_reversal"), false);
  assert.equal(typesEquivalent("thyroid", "gut_health"), false);
  assert.equal(typesEquivalent("", "pcod_pcos_reversal"), false);
});
