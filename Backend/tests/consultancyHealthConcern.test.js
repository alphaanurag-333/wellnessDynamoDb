const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseHealthConcernIdFromBody } = require("../services/consultancyHealthConcern");

test("parseHealthConcernIdFromBody accepts camelCase and snake_case", () => {
  assert.equal(parseHealthConcernIdFromBody({ healthConcernId: "abc" }), "abc");
  assert.equal(parseHealthConcernIdFromBody({ health_concern_id: "def" }), "def");
  assert.equal(parseHealthConcernIdFromBody({ primaryHealthConcern: "ghi" }), "ghi");
  assert.equal(parseHealthConcernIdFromBody({}), "");
  assert.equal(parseHealthConcernIdFromBody(null), null);
});
