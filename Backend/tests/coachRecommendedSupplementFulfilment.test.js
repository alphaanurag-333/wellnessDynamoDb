const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  assertClientConfirmedForFulfilment,
} = require("../models/coachRecommendedSupplementModel");

test("assertClientConfirmedForFulfilment passes when delivery was requested", () => {
  assert.doesNotThrow(() => assertClientConfirmedForFulfilment({
    deliveryRequestedAt: "2026-03-01T10:00:00.000Z",
  }));
});

test("assertClientConfirmedForFulfilment rejects when client has not confirmed", () => {
  assert.throws(
    () => assertClientConfirmedForFulfilment({ deliveryRequestedAt: null }),
    (err) => err.name === "ValidationError"
      && /confirm the order before logging fulfilment/i.test(err.message),
  );
});
