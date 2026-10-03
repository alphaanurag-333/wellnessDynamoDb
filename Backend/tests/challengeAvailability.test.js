const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isChallengeOpenInApp } = require("../utils/challengeAvailability");

const today = "2026-10-03";

describe("isChallengeOpenInApp", () => {
  it("keeps a published challenge that ends today", () => {
    assert.equal(
      isChallengeOpenInApp({ status: "published", endDate: "2026-10-03" }, today),
      true
    );
  });

  it("keeps a published challenge that ends later", () => {
    assert.equal(
      isChallengeOpenInApp({ status: "published", endDate: "2026-10-10" }, today),
      true
    );
  });

  it("hides a published challenge after the end date", () => {
    assert.equal(
      isChallengeOpenInApp({ status: "published", endDate: "2026-10-02" }, today),
      false
    );
  });

  it("hides drafts and completed challenges even when the end date is still ahead", () => {
    assert.equal(
      isChallengeOpenInApp({ status: "draft", endDate: "2026-10-10" }, today),
      false
    );
    assert.equal(
      isChallengeOpenInApp({ status: "completed", endDate: "2026-10-10" }, today),
      false
    );
  });
});
