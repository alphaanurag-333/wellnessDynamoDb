const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeWellnessJourneyFor } = require("../models/userModel");

test("normalizeWellnessJourneyFor accepts common payload shapes", () => {
  assert.deepEqual(normalizeWellnessJourneyFor("diabetes"), ["diabetes"]);
  assert.deepEqual(normalizeWellnessJourneyFor(["diabetes"]), ["diabetes"]);
  assert.deepEqual(normalizeWellnessJourneyFor(["diabetes", "thyroid"]), [
    "diabetes",
    "thyroid",
  ]);
  assert.deepEqual(normalizeWellnessJourneyFor("diabetes, thyroid"), [
    "diabetes",
    "thyroid",
  ]);
  assert.deepEqual(normalizeWellnessJourneyFor(JSON.stringify(["diabetes", "thyroid"])), [
    "diabetes",
    "thyroid",
  ]);
  assert.deepEqual(normalizeWellnessJourneyFor({ 0: "diabetes", 1: "thyroid" }), [
    "diabetes",
    "thyroid",
  ]);
  assert.deepEqual(
    normalizeWellnessJourneyFor([
      { id: "1", title: "Diabetes" },
      { id: "2", title: "Thyroid" },
    ]),
    ["Diabetes", "Thyroid"],
  );
  assert.deepEqual(normalizeWellnessJourneyFor({ title: "Diabetes" }), ["Diabetes"]);
  assert.equal(normalizeWellnessJourneyFor(null), null);
  assert.equal(normalizeWellnessJourneyFor(""), null);
});
