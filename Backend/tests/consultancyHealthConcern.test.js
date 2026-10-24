const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseHealthConcernIdFromBody,
  parseHealthConcernOtherFromBody,
  parseHealthConcernTokens,
  readHealthConcernListBody,
  matchHealthConcernTokens,
} = require("../services/consultancyHealthConcern");

test("parseHealthConcernIdFromBody accepts camelCase and snake_case", () => {
  assert.equal(parseHealthConcernIdFromBody({ healthConcernId: "abc" }), "abc");
  assert.equal(parseHealthConcernIdFromBody({ health_concern_id: "def" }), "def");
  assert.equal(parseHealthConcernIdFromBody({ primaryHealthConcern: "ghi" }), "ghi");
  assert.equal(parseHealthConcernIdFromBody({}), "");
  assert.equal(parseHealthConcernIdFromBody(null), null);
});

test("parseHealthConcernTokens accepts titles, ids, and comma-separated lists", () => {
  assert.deepEqual(
    parseHealthConcernTokens(["Fat Loss", "Gut Health", "Hypertension", "Diabetes Reversal"]),
    ["Fat Loss", "Gut Health", "Hypertension", "Diabetes Reversal"],
  );
  assert.deepEqual(
    parseHealthConcernTokens('["Fat Loss","Gut Health"]'),
    ["Fat Loss", "Gut Health"],
  );
  assert.deepEqual(parseHealthConcernTokens("Fat Loss, Gut Health"), ["Fat Loss", "Gut Health"]);
  assert.deepEqual(parseHealthConcernTokens("concern-id"), ["concern-id"]);
  assert.deepEqual(parseHealthConcernTokens(["Fat Loss", "fat loss"]), ["Fat Loss"]);
});

test("matchHealthConcernTokens resolves multiple titles to ids", () => {
  const catalog = [
    { id: "a", title: "Fat Loss", status: "active" },
    { id: "b", title: "Gut Health", status: "active" },
    { id: "c", title: "Hypertension", status: "active" },
    { id: "d", title: "Diabetes Reversal", status: "active" },
    { id: "e", title: "Other", status: "active" },
  ];
  const resolved = matchHealthConcernTokens(
    ["Fat Loss", "Gut Health", "Hypertension", "Diabetes Reversal"],
    catalog,
  );
  assert.deepEqual(resolved.healthConcernIds, ["a", "b", "c", "d"]);
  assert.equal(resolved.primaryHealthConcern, "a");
  assert.equal(resolved.primaryHealthConcernOther, null);
});

test("matchHealthConcernTokens rejects an unknown concern in a list", () => {
  assert.throws(
    () =>
      matchHealthConcernTokens(["Fat Loss", "Not A Concern"], [
        { id: "a", title: "Fat Loss", status: "active" },
      ]),
    /invalid or inactive: Not A Concern/,
  );
});

test("readHealthConcernListBody prefers healthConcerns over the primary field", () => {
  assert.deepEqual(
    readHealthConcernListBody({
      healthConcerns: ["Gut Health"],
      primaryHealthConcern: "Fat Loss",
    }),
    ["Gut Health"],
  );
  assert.deepEqual(
    readHealthConcernListBody({ primary_health_concern: ["Hypertension"] }),
    ["Hypertension"],
  );
});

test("parseHealthConcernOtherFromBody accepts camelCase and snake_case", () => {
  assert.equal(
    parseHealthConcernOtherFromBody({ healthConcernOther: "Joint pain" }),
    "Joint pain",
  );
  assert.equal(
    parseHealthConcernOtherFromBody({ health_concern_other: "Sleep issues" }),
    "Sleep issues",
  );
  assert.equal(parseHealthConcernOtherFromBody({}), "");
  assert.equal(parseHealthConcernOtherFromBody(null), "");
});
