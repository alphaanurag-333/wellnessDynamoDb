const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  healthConcernsToDropdownList,
} = require("../models/configDropdownModel");

const concerns = [
  { id: "hc-1", title: "Fat Loss", icon: "https://cdn.example/fat.png", status: "active" },
  { id: "hc-2", title: "Diabetes Reversal", status: "active" },
];

test("program-category dropdown is built from health concerns", () => {
  const list = healthConcernsToDropdownList(concerns, "program-category");
  assert.equal(list.slug, "program-category");
  assert.equal(list.title, "Program category");
  assert.equal(list.status, "active");
  assert.equal(list.options.length, 2);
  assert.equal(list.options[0].label, "Fat Loss");
  assert.equal(list.options[0].value, "hc-1");
  assert.equal(list.options[0].icon, "https://cdn.example/fat.png");
  assert.equal(list.options[0].on, true);
});

test("health-concern slug uses the same catalog with its own title", () => {
  const list = healthConcernsToDropdownList(concerns, "health-concern");
  assert.equal(list.slug, "health-concern");
  assert.equal(list.title, "Health concern");
  assert.equal(list.options[1].label, "Diabetes Reversal");
});
